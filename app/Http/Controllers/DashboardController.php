<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics
     *
     * @return JsonResponse
     */
    public function getStats(): JsonResponse
    {
        $stats = [
            'totalItems' => Item::count(),
            'lowStock' => Item::where('quantity', '<=', 10)->count(),
            'categories' => Category::count(),
        ];

        return response()->json($stats);
    }
}
