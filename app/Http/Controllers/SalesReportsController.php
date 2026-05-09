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
        
        // Force integer conversion
        $saleId = intval($saleId);
        $itemId = intval($itemId);
        
        if ($saleId <= 0 || $itemId <= 0) {
            return response()->json(['error' => 'Invalid sale ID or item ID'], 400);
        }
        
        try {
            // Use raw SQL for everything - guarantees type safety
            $saleItem = DB::select("
                SELECT si.id, si.quantity, si.unit_price, si.sale_id, si.item_id
                FROM sale_items si
                INNER JOIN sales s ON si.sale_id = s.id
                WHERE si.sale_id = ? AND si.item_id = ? AND s.user_id = ?
            ", [$saleId, $itemId, $userId]);
            
            if (count($saleItem) === 0) {
                return response()->json(['error' => 'Sale item not found'], 404);
            }
            
            $saleItemData = $saleItem[0];
            $quantityToReturn = intval($saleItemData->quantity);
            $unitPrice = floatval($saleItemData->unit_price);
            $amountToSubtract = $quantityToReturn * $unitPrice;
            $saleItemId = $saleItemData->id;
            
            // Delete the sale item using raw SQL
            DB::delete("DELETE FROM sale_items WHERE id = ?", [$saleItemId]);
            
            // Update sale total - get current first
            $sale = DB::select("SELECT total_amount FROM sales WHERE id = ? AND user_id = ?", [$saleId, $userId]);
            if (count($sale) > 0) {
                $currentTotal = floatval($sale[0]->total_amount);
                $newTotal = max(0, $currentTotal - $amountToSubtract);
                DB::update("UPDATE sales SET total_amount = ? WHERE id = ?", [$newTotal, $saleId]);
            }
            
            // Return quantity to stock - explicit UPDATE with integer value
            DB::update("UPDATE items SET quantity = quantity + ? WHERE id = ?", [$quantityToReturn, $itemId]);
            
            return response()->json(['message' => 'Item deleted successfully']);
            
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to delete item: ' . $e->getMessage()], 500);
        }
    }

/**
     * Update quantity of a specific sale item
     */
    public function updateItemQuantity(Request $request, $saleId, $itemId)
    {
        $userId = Auth::id();
        
        // Force integer conversion
        $saleId = intval($saleId);
        $itemId = intval($itemId);
        
        $validator = Validator::make($request->all(), [
            'quantity' => 'required|integer|min:1',
        ]);
        
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        
        $newQuantity = intval($request->input('quantity'));
        
        try {
            // Use raw SQL to find the sale item - direct integer comparison
            $saleItem = DB::select("
                SELECT si.id, si.quantity, si.unit_price, si.sale_id, si.item_id
                FROM sale_items si
                INNER JOIN sales s ON si.sale_id = s.id
                WHERE si.sale_id = ? AND si.item_id = ? AND s.user_id = ?
            ", [$saleId, $itemId, $userId]);
            
            if (count($saleItem) === 0) {
                return response()->json(['error' => 'Sale item not found'], 404);
            }
            
            $saleItemData = $saleItem[0];
            $oldQuantity = intval($saleItemData->quantity);
            $unitPrice = floatval($saleItemData->unit_price);
            $saleItemId = $saleItemData->id;
            $quantityChange = $newQuantity - $oldQuantity;
            
            // Check stock availability if increasing
            if ($quantityChange > 0) {
                $itemStock = DB::select("SELECT quantity FROM items WHERE id = ?", [$itemId]);
                if (count($itemStock) === 0) {
                    return response()->json(['error' => 'Item not found'], 404);
                }
                $currentStock = intval($itemStock[0]->quantity);
                if ($currentStock < $quantityChange) {
                    return response()->json(['error' => 'Insufficient stock available'], 400);
                }
            }
            
            // Update sale_items - quantity and total_price
            $newTotalPrice = $newQuantity * $unitPrice;
            DB::update("UPDATE sale_items SET quantity = ?, total_price = ? WHERE id = ?", 
                [$newQuantity, $newTotalPrice, $saleItemId]);
            
            // Update sales total_amount
            $priceDifference = $quantityChange * $unitPrice;
            DB::update("UPDATE sales SET total_amount = total_amount + ? WHERE id = ?", 
                [$priceDifference, $saleId]);
            
            // Update item inventory - decrease if quantity increased, increase if decreased
            if ($quantityChange > 0) {
                DB::update("UPDATE items SET quantity = quantity - ? WHERE id = ?", 
                    [$quantityChange, $itemId]);
            } elseif ($quantityChange < 0) {
                DB::update("UPDATE items SET quantity = quantity + ? WHERE id = ?", 
                    [abs($quantityChange), $itemId]);
            }
            
            // Return updated item data
            $updatedItem = DB::select("
                SELECT 
                    s.id as saleId,
                    i.id as itemId,
                    i.name as itemName,
                    i.barcode,
                    si.quantity,
                    (si.quantity * si.unit_price) as total_revenue
                FROM sale_items si
                INNER JOIN sales s ON si.sale_id = s.id
                INNER JOIN items i ON si.item_id = i.id
                WHERE si.id = ?
            ", [$saleItemId]);
            
            return response()->json(count($updatedItem) > 0 ? $updatedItem[0] : null);
            
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to update item: ' . $e->getMessage()], 500);
        }
    }
}
