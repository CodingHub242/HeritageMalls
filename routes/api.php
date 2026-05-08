<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\SalesReportsController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware(['auth:sanctum'])->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
    
    // Dashboard routes
    Route::get('/dashboard/stats', [DashboardController::class, 'getStats']);
    
    // Items routes
    Route::get('/items', [ItemController::class, 'index']);
    Route::get('/items/{id}', [ItemController::class, 'show']);
    Route::post('/items', [ItemController::class, 'store']);
    Route::put('/items/{id}', [ItemController::class, 'update']);
    Route::get('/items/delete/{id}', [ItemController::class, 'destroy']);
    
    // Categories routes
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{id}', [CategoryController::class, 'show']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{id}', [CategoryController::class, 'update']);
    Route::get('/categories/delete/{id}', [CategoryController::class, 'destroy']);
    
    // Activity routes
    Route::get('/activity/recent', [ActivityController::class, 'recent']);
    Route::get('/activity', [ActivityController::class, 'index']);
    Route::post('/activities/batch', [ActivityController::class, 'batchStore']);
    
    // Sales/POS routes
    Route::post('/sales', [SaleController::class, 'store']);
    Route::get('/sales', [SaleController::class, 'index']);
    Route::get('/sales/{id}', [SaleController::class, 'show']);
    
    // Sales Reports routes
    Route::get('/sales-reports/daily', [SalesReportsController::class, 'daily']);
    Route::get('/sales-reports/monthly', [SalesReportsController::class, 'monthly']);
    Route::get('/sales-reports/yearly', [SalesReportsController::class, 'yearly']);
    Route::get('/sales-reports/breakdown', [SalesReportsController::class, 'breakdown']);
    
    // Import routes
    Route::post('/import', [ItemController::class, 'importFromExcel']);
    
    // Admin-only routes (role-based access)
    Route::get('/admin/users', [UserController::class, 'index']);
    Route::get('/admin/users/{id}', [UserController::class, 'show']);
    Route::post('/admin/users', [UserController::class, 'store']);
    Route::put('/admin/users/{id}/role', [UserController::class, 'updateRole']);
    Route::delete('/admin/users/{id}', [UserController::class, 'destroy']);
    Route::get('/admin/users/count', [UserController::class, 'count']);
});
