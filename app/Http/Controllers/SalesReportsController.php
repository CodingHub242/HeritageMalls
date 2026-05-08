<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class SalesReportsController extends Controller
{
    /**
     * Get daily sales report
     */
    public function daily()
    {
        $userId = Auth::id();
        
        $dailySales = DB::table('sales')
            ->selectRaw('DATE(sales.created_at) as date')
            ->selectRaw('SUM(total_amount) as total_sales')
            ->selectRaw('COUNT(DISTINCT sales.id) as transactions')
            ->selectRaw('SUM(sale_items.quantity) as total_items_sold')
            ->leftJoin('sale_items', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.user_id', $userId)
            ->whereDate('sales.created_at', '>=', DB::raw('CURDATE() - INTERVAL 7 DAY'))
            ->groupBy('date')
            ->orderBy('date', 'DESC')
            ->get();
        
        return response()->json($dailySales);
    }

    /**
     * Get monthly sales report
     */
    public function monthly()
    {
        $userId = Auth::id();
        
        $monthlySales = DB::table('sales')
            ->selectRaw('DATE_FORMAT(sales.created_at, "%Y-%m") as month')
            ->selectRaw('SUM(total_amount) as total_sales')
            ->selectRaw('COUNT(DISTINCT sales.id) as transactions')
            ->selectRaw('SUM(sale_items.quantity) as total_items_sold')
            ->leftJoin('sale_items', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.user_id', $userId)
            ->whereDate('sales.created_at', '>=', DB::raw('DATE_SUB(CURDATE(), INTERVAL 12 MONTH)'))
            ->groupBy('month')
            ->orderBy('month', 'DESC')
            ->get();
        
        return response()->json($monthlySales);
    }

    /**
     * Get yearly sales report
     */
    public function yearly()
    {
        $userId = Auth::id();
        
        $yearlySales = DB::table('sales')
            ->selectRaw('YEAR(sales.created_at) as year')
            ->selectRaw('SUM(total_amount) as total_sales')
            ->selectRaw('COUNT(DISTINCT sales.id) as transactions')
            ->selectRaw('SUM(sale_items.quantity) as total_items_sold')
            ->leftJoin('sale_items', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.user_id', $userId)
            ->whereDate('sales.created_at', '>=', DB::raw('DATE_SUB(CURDATE(), INTERVAL 5 YEAR)'))
            ->groupBy('year')
            ->orderBy('year', 'DESC')
            ->get();
        
        return response()->json($yearlySales);
    }

    /**
     * Get item breakdown (most sold items)
     */
    public function breakdown()
    {
        $userId = Auth::id();
        
        $itemBreakdown = DB::table('sale_items')
            ->join('items', 'sale_items.item_id', '=', 'items.id')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->select('items.id as itemId')
            ->select('items.name as itemName')
            ->selectRaw('SUM(sale_items.quantity) as totalSold')
            ->selectRaw('SUM(sale_items.quantity * sale_items.unit_price) as totalRevenue')
            ->where('sales.user_id', $userId)
            ->whereDate('sales.created_at', '>=', DB::raw('DATE_SUB(CURDATE(), INTERVAL 30 DAY)'))
            ->groupBy('items.id', 'items.name')
            ->orderByRaw('SUM(sale_items.quantity) DESC')
            ->limit(10)
            ->get();

        return response()->json($itemBreakdown);
    }

/**
     * Get detailed items sold for a specific date
     */
    public function dailyItems($date, Request $request)
    {
        $userId = Auth::id();
        
        // Use raw SQL to get individual sale items with itemId and saleId
        $items = DB::select("
            SELECT 
                sale_items.id as saleItemId,
                sales.id as saleId,
                items.id as itemId,
                items.name as itemName,
                items.barcode,
                sale_items.quantity,
                (sale_items.quantity * sale_items.unit_price) as total_revenue
            FROM sale_items
            INNER JOIN sales ON sale_items.sale_id = sales.id
            INNER JOIN items ON sale_items.item_id = items.id
            WHERE sales.user_id = ?
            AND DATE(sales.created_at) = ?
            ORDER BY sales.created_at DESC
        ", [$userId, $date]);
        
        return response()->json($items);
    }

/**
     * Get detailed items sold for a specific month (YYYY-MM)
     */
    public function monthlyItems($month, Request $request)
    {
        $userId = Auth::id();
        
        // Use raw SQL to get individual sale items with itemId and saleId
        $items = DB::select("
            SELECT 
                sale_items.id as saleItemId,
                sales.id as saleId,
                items.id as itemId,
                items.name as itemName,
                items.barcode,
                sale_items.quantity,
                (sale_items.quantity * sale_items.unit_price) as total_revenue
            FROM sale_items
            INNER JOIN sales ON sale_items.sale_id = sales.id
            INNER JOIN items ON sale_items.item_id = items.id
            WHERE sales.user_id = ?
            AND DATE_FORMAT(sales.created_at, '%Y-%m') = ?
            ORDER BY sales.created_at DESC
        ", [$userId, $month]);
        
        return response()->json($items);
    }

    /**
     * Get detailed items sold for a specific year
     */
    public function yearlyItems($year, Request $request)
    {
        $userId = Auth::id();
        
        // Use raw SQL to get individual sale items with itemId and saleId
        $items = DB::select("
            SELECT 
                sale_items.id as saleItemId,
                sales.id as saleId,
                items.id as itemId,
                items.name as itemName,
                items.barcode,
                sale_items.quantity,
                (sale_items.quantity * sale_items.unit_price) as total_revenue
            FROM sale_items
            INNER JOIN sales ON sale_items.sale_id = sales.id
            INNER JOIN items ON sale_items.item_id = items.id
            WHERE sales.user_id = ?
            AND YEAR(sales.created_at) = ?
            ORDER BY sales.created_at DESC
        ", [$userId, $year]);
        
        return response()->json($items);
    }

/**
     * Delete a specific sale item
     */
    public function deleteItem($saleId, $itemId)
    {
        $userId = Auth::id();
        
        // Ensure IDs are integers to prevent type mismatch issues
        $saleId = intval($saleId);
        $itemId = intval($itemId);
        
        // Validate required parameters
        if ($saleId <= 0 || $itemId <= 0) {
            return response()->json(['error' => 'Invalid sale ID or item ID'], 400);
        }
        
        DB::beginTransaction();
        
try {
            // Find the sale item - use direct integer comparison with explicit CAST
            $saleItem = DB::table('sale_items')
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->whereRaw('CAST(sale_items.sale_id AS UNSIGNED) = ?', [$saleId])
                ->whereRaw('CAST(sale_items.item_id AS UNSIGNED) = ?', [$itemId])
                ->where('sales.user_id', '=', $userId)
                ->first();
            
            if (!$saleItem) {
                error_log("Delete: Sale item not found for saleId: $saleId, itemId: $itemId");
                return response()->json(['error' => 'Sale item not found'], 404);
            }
            
            error_log("Delete: Found sale_item.id: " . $saleItem->id . " with quantity: " . $saleItem->quantity);
            
            // Get the sale to update total amount
            $sale = DB::table('sales')
                ->where('id', $saleId)
                ->where('user_id', $userId)
                ->first();
                
            if (!$sale) {
                return response()->json(['error' => 'Sale not found'], 404);
            }
            
            // Calculate the amount to subtract
            $amountToSubtract = $saleItem->quantity * $saleItem->unit_price;
            
            // Delete the sale item
            DB::table('sale_items')
                ->where('id', $saleItem->id)
                ->delete();
                
            // Update the sale total amount
            $newTotal = max(0, $sale->total_amount - $amountToSubtract);
            DB::table('sales')
                ->where('id', $saleId)
                ->update(['total_amount' => $newTotal]);
                
            // Update item inventory (return quantity to stock)
            DB::table('items')
                ->where('id', $itemId)
                ->increment('quantity', $saleItem->quantity);
                
            DB::commit();
            
            return response()->json(['message' => 'Item deleted successfully']);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to delete item: ' . $e->getMessage()], 500);
        }
    }

/**
     * Update quantity of a specific sale item
     */
    public function updateItemQuantity(Request $request, $saleId, $itemId)
    {
        $userId = Auth::id();
        
        // Ensure IDs are integers to prevent type mismatch issues
        $saleId = intval($saleId);
        $itemId = intval($itemId);
        
        // Debug: Log the incoming parameters
        error_log("=== updateItemQuantity START ===");
        error_log("saleId: " . $saleId . " (type: " . gettype($saleId) . ")");
        error_log("itemId: " . $itemId . " (type: " . gettype($itemId) . ")");
        
        $validator = Validator::make($request->all(), [
            'quantity' => 'required|integer|min:1',
        ]);
        
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        
        $newQuantity = intval($request->input('quantity'));
        error_log("newQuantity: " . $newQuantity);
        
        DB::beginTransaction();
        
try {
            // Find the sale item - use direct integer comparison with explicit CAST
            $saleItem = DB::table('sale_items')
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->join('items', 'sale_items.item_id', '=', 'items.id')
                ->whereRaw('CAST(sale_items.sale_id AS UNSIGNED) = ?', [$saleId])
                ->whereRaw('CAST(sale_items.item_id AS UNSIGNED) = ?', [$itemId])
                ->where('sales.user_id', '=', $userId)
                ->first();
            
            error_log("Query result (saleItem): " . json_encode($saleItem));
            
            if (!$saleItem) {
                error_log("Sale item not found for saleId: $saleId, itemId: $itemId");
                return response()->json(['error' => 'Sale item not found'], 404);
            }
            
            // Store the sale_item ID for update
            $saleItemId = $saleItem->id;
            error_log("Found sale_item.id: " . $saleItemId);
            
            // Get the item to check stock and get price
            $item = DB::table('items')
                ->where('id', $itemId)
                ->first();
            
            error_log("Item data: " . json_encode($item));
                
            if (!$item) {
                return response()->json(['error' => 'Item not found'], 404);
            }
            
            // Check if sufficient stock is available for the increase
            $quantityChange = $newQuantity - $saleItem->quantity;
            error_log("Current sale_item quantity: " . $saleItem->quantity);
            error_log("Quantity change: " . $quantityChange);
            
            if ($quantityChange > 0 && $item->quantity < $quantityChange) {
                return response()->json(['error' => 'Insufficient stock available'], 400);
            }
            
            // Get the sale to update total amount
            $sale = DB::table('sales')
                ->where('id', $saleId)
                ->where('user_id', $userId)
                ->first();
                
            if (!$sale) {
                return response()->json(['error' => 'Sale not found'], 404);
            }
            
            error_log("Current sale total_amount: " . $sale->total_amount);
            
            // Calculate the price difference
            $unitPrice = $saleItem->unit_price;
            $priceDifference = ($newQuantity - $saleItem->quantity) * $unitPrice;
            error_log("Unit price: " . $unitPrice);
            error_log("Price difference: " . $priceDifference);
            
            // Update the sale item quantity and total price
            $updateResult = DB::table('sale_items')
                ->where('id', $saleItem->id)
                ->update([
                    'quantity' => $newQuantity,
                    'total_price' => $newQuantity * $unitPrice
                ]);
            error_log("Sale items update result (rows affected): " . $updateResult);
                
            // Update the sale total amount
            $newTotal = $sale->total_amount + $priceDifference;
            $saleUpdateResult = DB::table('sales')
                ->where('id', $saleId)
                ->update(['total_amount' => $newTotal]);
            error_log("Sale update result (rows affected): " . $saleUpdateResult);
                
            // Update item inventory
            if ($quantityChange > 0) {
                // Decrease stock (selling more)
                $itemDecreaseResult = DB::table('items')
                    ->where('id', $itemId)
                    ->decrement('quantity', $quantityChange);
                error_log("Item decrement result: " . $itemDecreaseResult);
            } elseif ($quantityChange < 0) {
                // Increase stock (selling less)
                $itemIncreaseResult = DB::table('items')
                    ->where('id', $itemId)
                    ->increment('quantity', abs($quantityChange));
                error_log("Item increment result: " . $itemIncreaseResult);
            }
            
            DB::commit();
            
            error_log("=== updateItemQuantity END (SUCCESS) ===");
            
        // Return updated sale item with itemId and saleId
            $updatedItem = DB::select("
                SELECT 
                    sales.id as saleId,
                    items.id as itemId,
                    items.name as itemName,
                    items.barcode,
                    sale_items.quantity,
                    (sale_items.quantity * sale_items.unit_price) as total_revenue
                FROM sale_items
                INNER JOIN sales ON sale_items.sale_id = sales.id
                INNER JOIN items ON sale_items.item_id = items.id
                WHERE sale_items.id = ?
            ", [$saleItem->id]);
            
            return response()->json(count($updatedItem) > 0 ? $updatedItem[0] : null);
            
        } catch (\Exception $e) {
            DB::rollBack();
            error_log("=== updateItemQuantity ERROR: " . $e->getMessage());
            return response()->json(['error' => 'Failed to update item: ' . $e->getMessage()], 500);
        }
    }
}