<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

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
}