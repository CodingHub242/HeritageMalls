<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ItemController extends Controller
{
    /**
     * Store a newly created item in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        try {
            // Validate the request
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'category_id' => 'required|exists:categories,id',
                'barcode' => 'nullable|string|max:255',
                'quantity' => 'required|integer|min:0',
                'price' => 'required|numeric|min:0',
                'currency' => 'required|string|max:3',
                'images' => 'nullable|array|max:5',
                'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:2048'
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            DB::beginTransaction();

            // Create the item
            $item = new Item();
            $item->name = $request->name;
            $item->description = $request->description;
            $item->category_id = $request->category_id;
            $item->barcode = $request->barcode;
            $item->quantity = $request->quantity;
            $item->price = $request->price;
            $item->currency = $request->currency;

            // Initialize image URLs array
            $imageUrls = [];

            // Handle multiple image uploads
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $image) {
                    // Generate unique filename
                    $filename = Str::uuid() . '.' . $image->getClientOriginalExtension();
                    
                    // Store the image
                    $path = $image->storeAs('public/items', $filename);
                    
                    // Add the URL to array
                    $imageUrls[] = Storage::url($path);
                }
            }

            // Store image URLs in JSON format
            $item->image_urls = $imageUrls;
            // Keep the first image as the main image_url for backwards compatibility
            $item->image_url = $imageUrls[0] ?? null;

$item->save();

            DB::commit();

            // Log activity for item creation
            Activity::create([
                'type' => 'added',
                'item' => 'Item: ' . $item->name,
                'details' => 'New item added to inventory',
                'user_id' => auth()->id(),
                'synced' => true,
            ]);

            // Load the category relationship
            $item->load('category');

            return response()->json($item, 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to create item: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update the specified item in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        try {
            // Find the item
            $item = Item::findOrFail($id);

            // Validate the request
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'category_id' => 'required|exists:categories,id',
                'barcode' => 'nullable|string|max:255',
                'quantity' => 'required|integer|min:0',
                'price' => 'required|numeric|min:0',
                'currency' => 'required|string|max:3',
                'images' => 'nullable|array|max:5',
                'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:2048',
                'remove_images' => 'nullable|array',
                'remove_images.*' => 'string'
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            DB::beginTransaction();

            // Update basic information
            $item->name = $request->name;
            $item->description = $request->description;
            $item->category_id = $request->category_id;
            $item->barcode = $request->barcode;
            $item->quantity = $request->quantity;
            $item->price = $request->price;
            $item->currency = $request->currency;

            // Get current image URLs
            $currentImageUrls = $item->image_urls ?? [];

            // Remove images if requested
            if ($request->has('remove_images')) {
                foreach ($request->remove_images as $imageUrl) {
                    // Remove from storage
                    $path = str_replace('/storage/', 'public/', $imageUrl);
                    Storage::delete($path);
                    
                    // Remove from URLs array
                    $currentImageUrls = array_diff($currentImageUrls, [$imageUrl]);
                }
            }

            // Handle new image uploads
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $image) {
                    // Check if we're still under the limit
                    if (count($currentImageUrls) >= 5) {
                        break;
                    }

                    // Generate unique filename
                    $filename = Str::uuid() . '.' . $image->getClientOriginalExtension();
                    
                    // Store the image
                    $path = $image->storeAs('public/items', $filename);
                    
                    // Add the URL to array
                    $currentImageUrls[] = Storage::url($path);
                }
            }

            // Update image URLs
            $item->image_urls = array_values($currentImageUrls); // Reset array keys
            $item->image_url = $currentImageUrls[0] ?? null;

$item->save();

            DB::commit();

            // Log activity for item update
            $oldQuantity = $item->getOriginal('quantity');
            $newQuantity = $item->quantity;
            
            if ($oldQuantity != $newQuantity) {
                Activity::create([
                    'type' => 'stock_update',
                    'item' => 'Item: ' . $item->name,
                    'details' => 'Stock level updated from ' . $oldQuantity . ' to ' . $newQuantity . ' units',
                    'user_id' => auth()->id(),
                    'synced' => true,
                ]);
            } else {
                Activity::create([
                    'type' => 'updated',
                    'item' => 'Item: ' . $item->name,
                    'details' => 'Item information updated',
                    'user_id' => auth()->id(),
                    'synced' => true,
                ]);
            }

            // Load the category relationship
            $item->load('category');

            return response()->json($item);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to update item: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Display a listing of the items.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        $items = Item::with('category')->get();
        return response()->json($items);
    }

    /**
     * Display the specified item.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        $item = Item::with('category')->findOrFail($id);
        return response()->json($item);
    }

    /**
     * Remove the specified item from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $item = Item::findOrFail($id);

            // Delete associated images from storage
            if (!empty($item->image_urls)) {
                foreach ($item->image_urls as $imageUrl) {
                    $path = str_replace('/storage/', 'public/', $imageUrl);
                    Storage::delete($path);
                }
            }

$item->delete();

            DB::commit();

            // Log activity for item deletion
            Activity::create([
                'type' => 'deleted',
                'item' => 'Item: ' . $item->name,
                'details' => 'Item removed from inventory',
                'user_id' => auth()->id(),
                'synced' => true,
            ]);

            return response()->json(null, 204);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to delete item: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Import items from JSON array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function importFromExcel(Request $request)
    {
        try {
            // Validate the request
            $validator = Validator::make($request->all(), [
                'items' => 'required|array',
                'items.*.name' => 'required|string|max:255',
                'items.*.barcode' => 'nullable|string|max:255',
                'items.*.quantity' => 'required|integer|min:0',
                'items.*.price' => 'required|numeric|min:0',
                'items.*.description' => 'nullable|string',
                'items.*.category' => 'nullable|string', // Accept category as text
                'items.*.selling_price' => 'nullable|numeric|min:0',
                'items.*.currency' => 'nullable|string|max:3',
                'items.*.image_url' => 'nullable|url',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $user = auth()->user();

            $itemsData = $request->input('items');
            
            if (empty($itemsData)) {
                return response()->json(['error' => 'No items provided for import'], 400);
            }
            
            // Get the default category (first category) for empty category values
            $defaultCategoryId = DB::table('categories')->orderBy('id')->value('id');
            if (!$defaultCategoryId) {
                // If no categories exist, create a default one
                $defaultCategoryId = DB::table('categories')->insertGetId([
                    'name' => 'General',
                    'description' => 'Default category',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }
            
            // Process data rows
            $importedCount = 0;
            $failedCount = 0;
            $errors = [];
            
            DB::beginTransaction();
            
            foreach ($itemsData as $index => $itemData) {
                $rowNumber = $index + 1; // For error reporting
                
                try {
                    // Validate required fields are not empty
                    if (empty($itemData['name'])) {
                        throw new Exception("Name cannot be empty");
                    }
                    
                    // if (empty($itemData['barcode'])) {
                    //     throw new Exception("Barcode cannot be empty");
                    // }
                    
                    // Validate quantity is integer >= 0
                    if (!is_numeric($itemData['quantity']) || $itemData['quantity'] < 0) {
                        throw new Exception("Quantity must be a non-negative integer");
                    }
                    
                    // Validate price is numeric >= 0
                    if (!is_numeric($itemData['price']) || $itemData['price'] < 0) {
                        throw new Exception("Price must be a non-negative number");
                    }
                    
                    // Check if barcode already exists
                    if (!empty($itemData['barcode'])) {
                        $existingItem = Item::where('barcode', $itemData['barcode'])->first();
                        if ($existingItem) {
                            throw new Exception("Barcode already exists");
                        }
                    }
                    
                    // Handle category logic: if category is text, check if exists else create
                    $categoryId = null;
                    if (!empty($itemData['category'])) {
                        // Category provided as text - check if exists
                        $existingCategory = DB::table('categories')
                            ->where('name', trim($itemData['category']))
                            ->first();
                            
                        if ($existingCategory) {
                            $categoryId = $existingCategory->id;
                        } else {
                            // Create new category
                            $categoryId = DB::table('categories')->insertGetId([
                                'name' => trim($itemData['category']),
                                'description' => 'Imported category',
                                'created_at' => now(),
                                'updated_at' => now()
                            ]);
                        }
                    } else {
                        // No category provided - use default category
                        $categoryId = $defaultCategoryId;
                    }
                    
                    // Validate selling_price if provided
                    if (!empty($itemData['selling_price']) && (!is_numeric($itemData['selling_price']) || $itemData['selling_price'] < 0)) {
                        throw new Exception("Selling price must be a non-negative number");
                    }
                    
                    // Validate currency if provided
                    if (!empty($itemData['currency']) && strlen($itemData['currency']) > 3) {
                        throw new Exception("Currency code must be 3 characters or less");
                    }
                    
                    // Create the item
                    $item = new Item();
                    $item->name = $itemData['name'];
                    $item->description = $itemData['description'] ?? null;
                    $item->category_id = $categoryId;
                    $item->user_id = $user->id;
                    $item->barcode = $itemData['barcode'] ?? null;
                    $item->quantity = intval($itemData['quantity']);
                    $item->price = floatval($itemData['price']);
                    $item->currency = $itemData['currency'] ?? 'USD';
                    
                    // Handle selling_price if provided
                    if (!empty($itemData['selling_price']) && is_numeric($itemData['selling_price']) && $itemData['selling_price'] >= 0) {
                        $item->selling_price = floatval($itemData['selling_price']);
                    }
                    
                    $item->save();
                    
                    $importedCount++;
                } catch (\Exception $e) {
                    $failedCount++;
                    $errors[] = [
                        'row' => $rowNumber,
                        'field' => $e->getMessage(),
                        'message' => $e->getMessage(),
                        'value' => isset($itemData) ? json_encode($itemData) : 'Unknown'
                    ];
                    
                    // Continue processing other rows
                    continue;
                }
            }
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'imported' => $importedCount,
                'failed' => $failedCount,
                'total' => $importedCount + $failedCount,
                'errors' => $errors,
                'message' => "Import completed: {$importedCount} successful, {$failedCount} failed"
            ], 200);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Import failed: ' . $e->getMessage()], 500);
        }
    }
}
