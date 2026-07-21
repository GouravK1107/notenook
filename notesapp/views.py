from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib import messages
import json
from .models import Note, Category, Favorite, CustomUser

# ---- Page views ----
def homepage(request):
    return render(request, 'notesapp/index.html')

def register_view(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        name = request.POST.get('name')
        password1 = request.POST.get('password1')
        password2 = request.POST.get('password2')
        
        # Validation
        errors = {}
        if not email:
            errors['email'] = 'Email is required'
        elif CustomUser.objects.filter(email=email).exists():
            errors['email'] = 'Email already registered'
        
        if not name:
            errors['name'] = 'Name is required'
        
        if not password1:
            errors['password1'] = 'Password is required'
        elif len(password1) < 6:
            errors['password1'] = 'Password must be at least 6 characters'
        
        if password1 != password2:
            errors['password2'] = 'Passwords do not match'
        
        if errors:
            return render(request, 'notesapp/register.html', {
                'errors': errors, 
                'form_data': request.POST
            })
        
        try:
            # Generate a unique username from email
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            while CustomUser.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            # Create user
            user = CustomUser.objects.create_user(
                username=username,
                email=email,
                password=password1,
                name=name,
                first_name=name
            )
            
            # Log the user in
            login(request, user)
            
            # Redirect to dashboard
            return redirect('dashboard')
            
        except Exception as e:
            return render(request, 'notesapp/register.html', {
                'errors': {'general': str(e)},
                'form_data': request.POST
            })
    
    return render(request, 'notesapp/register.html')

def login_view(request):
    if request.method == 'POST':
        email = request.POST.get('username')
        password = request.POST.get('password')
        
        if not email or not password:
            return render(request, 'notesapp/login.html', {
                'error': 'Email and password are required',
                'username': email
            })
        
        # Authenticate using email
        user = authenticate(request, username=email, password=password)
        
        if user is not None:
            login(request, user)
            # Check if next parameter exists for redirect
            next_url = request.GET.get('next', 'dashboard')
            return redirect(next_url)
        else:
            return render(request, 'notesapp/login.html', {
                'error': 'Invalid email or password',
                'username': email
            })
    
    return render(request, 'notesapp/login.html')

@login_required
def logout_view(request):
    logout(request)
    return redirect('homepage')

@login_required
def dashboard(request):
    # Get all notes for the user
    notes = Note.objects.filter(user=request.user).select_related('category')
    favorite_note_ids = Favorite.objects.filter(user=request.user).values_list('note_id', flat=True)
    
    notes_list = []
    for note in notes:
        notes_list.append({
            'id': note.id,
            'title': note.title,
            'content': note.content,
            'category': note.category.name if note.category else 'Uncategorized',
            'favorite': note.id in favorite_note_ids,
            'updated_at': note.updated_at.timestamp() * 1000,
            'created_at': note.created_at.timestamp() * 1000,
        })
    
    # Get categories
    categories = Category.objects.filter(user=request.user) | Category.objects.filter(user__isnull=True)
    
    context = {
        'notes_json': json.dumps(notes_list),
        'categories': categories,
        'user': request.user,
    }
    return render(request, 'notesapp/dashboard.html', context)

# ---- AJAX endpoints ----
@login_required
@require_http_methods(["GET"])
def get_notes(request):
    notes = Note.objects.filter(user=request.user).select_related('category')
    favorite_ids = Favorite.objects.filter(user=request.user).values_list('note_id', flat=True)
    data = []
    for note in notes:
        data.append({
            'id': note.id,
            'title': note.title,
            'content': note.content,
            'category': note.category.name if note.category else 'Uncategorized',
            'favorite': note.id in favorite_ids,
            'updated_at': note.updated_at.timestamp() * 1000,
        })
    return JsonResponse(data, safe=False)

@login_required
@require_http_methods(["POST"])
def create_note(request):
    try:
        data = json.loads(request.body)
        title = data.get('title', '').strip()
        content = data.get('content', '').strip()
        category_name = data.get('category', 'General').strip()
        favorite = data.get('favorite', False)
        
        # Validation
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        if not content:
            return JsonResponse({'error': 'Content is required'}, status=400)
        
        # Get or create category
        category = None
        if category_name:
            # Try user's category first
            category = Category.objects.filter(name=category_name, user=request.user).first()
            if not category:
                # Try global category
                category = Category.objects.filter(name=category_name, user__isnull=True).first()
            if not category:
                # Create user-specific category
                category = Category.objects.create(name=category_name, user=request.user)
        
        # Create note
        note = Note.objects.create(
            user=request.user,
            title=title,
            content=content,
            category=category,
            is_favorite=favorite
        )
        
        # Add to favorites if marked
        if favorite:
            Favorite.objects.get_or_create(user=request.user, note=note)
        
        response = {
            'id': note.id,
            'title': note.title,
            'content': note.content,
            'category': category.name if category else 'Uncategorized',
            'favorite': favorite,
            'updated_at': note.updated_at.timestamp() * 1000,
        }
        return JsonResponse(response, status=201)
    
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
@require_http_methods(["PUT"])
def update_note(request, note_id):
    try:
        note = get_object_or_404(Note, id=note_id, user=request.user)
        data = json.loads(request.body)
        
        title = data.get('title', '').strip()
        content = data.get('content', '').strip()
        category_name = data.get('category', '').strip()
        favorite = data.get('favorite', False)
        
        # Validation
        if not title:
            return JsonResponse({'error': 'Title is required'}, status=400)
        if not content:
            return JsonResponse({'error': 'Content is required'}, status=400)
        
        # Update fields
        note.title = title
        note.content = content
        
        # Update category
        if category_name:
            category = Category.objects.filter(name=category_name, user=request.user).first()
            if not category:
                category = Category.objects.filter(name=category_name, user__isnull=True).first()
            if not category:
                category = Category.objects.create(name=category_name, user=request.user)
            note.category = category
        else:
            note.category = None
        
        note.is_favorite = favorite
        note.save()
        
        # Update Favorite model
        if favorite:
            Favorite.objects.get_or_create(user=request.user, note=note)
        else:
            Favorite.objects.filter(user=request.user, note=note).delete()
        
        response = {
            'id': note.id,
            'title': note.title,
            'content': note.content,
            'category': note.category.name if note.category else 'Uncategorized',
            'favorite': note.is_favorite,
            'updated_at': note.updated_at.timestamp() * 1000,
        }
        return JsonResponse(response)
    
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
@require_http_methods(["DELETE"])
def delete_note(request, note_id):
    try:
        note = get_object_or_404(Note, id=note_id, user=request.user)
        note.delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
@require_http_methods(["POST"])
def toggle_favorite(request, note_id):
    try:
        note = get_object_or_404(Note, id=note_id, user=request.user)
        favorite, created = Favorite.objects.get_or_create(user=request.user, note=note)
        if not created:
            favorite.delete()
            note.is_favorite = False
        else:
            note.is_favorite = True
        note.save()
        return JsonResponse({'favorite': note.is_favorite})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
@require_http_methods(["GET"])
def get_categories(request):
    categories = Category.objects.filter(user=request.user) | Category.objects.filter(user__isnull=True)
    data = [{'id': c.id, 'name': c.name} for c in categories]
    return JsonResponse(data, safe=False)