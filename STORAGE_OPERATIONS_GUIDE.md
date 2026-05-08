# Laravel Storage File Operations Guide

## Current Storage Setup
Your Laravel application stores item images in: `storage/app/public/items/`

## Reading Files from Storage Directory

### 1. Get All Images for an Item
```php
use Illuminate\Support\Facades\Storage;

// Get all images for a specific item
$itemId = 123; // Replace with actual item ID
$directory = 'public/items';
$images = [];

// Get all files in the items directory
$files = Storage::disk('local')->files($directory);

// Filter for specific item images (if organized by item ID)
$itemImages = collect($files)->filter(function($file) use ($itemId) {
    return str_contains($file, 'item_' . $itemId);
})->map(function($file) {
    return [
        'name' => basename($file),
        'url' => Storage::url($file),
        'size' => Storage::size($file),
        'last_modified' => Storage::lastModified($file)
    ];
})->toArray();
```

### 2. Read Image URLs from Database
Based on your Item model structure:
```php
$item = Item::find($itemId);
$imageUrls = $item->image_urls ?? []; // Array of URLs
$primaryImage = $item->image_url; // Single primary image URL
```

### 3. Check if Image Exists
```php
$imagePath = 'public/items/' . $filename;
if (Storage::disk('local')->exists($imagePath)) {
    $imageUrl = Storage::url($imagePath);
    // Image exists and is accessible
}
```

## Updating/Replacing Files in Storage Directory

### 1. Upload New Image (Based on Your Controller)
```php
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

public function uploadImage(Request $request)
{
    $request->validate([
        'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
    ]);

    $image = $request->file('images')[0]; // For single image
    $filename = Str::uuid() . '.' . $image->getClientOriginalExtension();
    
    // Store in public/items directory
    $path = $image->storeAs('public/items', $filename);
    
    // Get public URL
    $url = Storage::url($path);
    
    return [
        'path' => $path,
        'url' => $url
    ];
}
```

### 2. Update Existing Item Images
```php
public function updateItemImages(Request $request, $itemId)
{
    $item = Item::findOrFail($itemId);
    
    // Handle new image uploads
    if ($request->hasFile('images')) {
        $newImages = [];
        
        foreach ($request->file('images') as $image) {
            $filename = Str::uuid() . '.' . $image->getClientOriginalExtension();
            $path = $image->storeAs('public/items', $filename);
            $url = Storage::url($path);
            $newImages[] = $url;
        }
        
        // Update item with new images
        $item->update([
            'image_urls' => $newImages,
            'image_url' => $newImages[0] ?? null
        ]);
        
        return response()->json(['success' => true, 'images' => $newImages]);
    }
}
```

### 3. Delete Specific Image
```php
public function deleteImage($imageUrl)
{
    // Convert URL to storage path
    $path = str_replace('/storage/', 'public/', $imageUrl);
    
    if (Storage::exists($path)) {
        Storage::delete($path);
        return true;
    }
    
    return false;
}
```

### 4. Replace Single Image
```php
public function replaceItemImage(Request $request, $itemId)
{
    $item = Item::findOrFail($itemId);
    
    if ($request->hasFile('image')) {
        // Delete old image if exists
        if ($item->image_url) {
            $oldPath = str_replace('/storage/', 'public/', $item->image_url);
            Storage::delete($oldPath);
        }
        
        // Upload new image
        $image = $request->file('image');
        $filename = Str::uuid() . '.' . $image->getClientOriginalExtension();
        $path = $image->storeAs('public/items', $filename);
        $url = Storage::url($path);
        
        // Update item
        $item->update([
            'image_urls' => [$url],
            'image_url' => $url
        ]);
        
        return response()->json(['success' => true, 'url' => $url]);
    }
}
```

## Frontend Integration (Angular)

### Service Methods
```typescript
// item.service.ts
uploadItemImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('images[]', file);
    
    return this.http.post('/api/items', formData);
}

updateItemImage(itemId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('images[]', file);
    
    return this.http.put(`/api/items/${itemId}`, formData);
}

getItemImages(itemId: number): Observable<any> {
    return this.http.get(`/api/items/${itemId}`);
}
```

### Component Usage
```typescript
// items.page.ts
onImageUpload(event: any, itemId?: number) {
    const file = event.target.files[0];
    if (file) {
        const serviceCall = itemId 
            ? this.itemService.updateItemImage(itemId, file)
            : this.itemService.uploadItemImage(file);
            
        serviceCall.subscribe(
            response => {
                console.log('Image uploaded successfully:', response);
                this.loadItems(); // Refresh data
            },
            error => {
                console.error('Upload failed:', error);
            }
        );
    }
}
```

## Key Implementation Details

1. **Storage Path**: `storage/app/public/items/`
2. **Public URL**: `/storage/items/filename.jpg`
3. **File Naming**: Uses UUID for unique filenames
4. **Database Storage**: URLs stored in `image_urls` (JSON array) and `image_url` (primary)
5. **Validation**: Images must be jpeg, png, jpg, or gif, max 2MB
6. **Limit**: Maximum 5 images per item

## Storage Link Command
Make sure you have created the storage link:
```bash
php artisan storage:link
```

This creates a symbolic link from `public/storage` to `storage/app/public` allowing web access to stored files.
