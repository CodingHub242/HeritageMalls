<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Item;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SaleController extends Controller
{
    /**
     * Store a newly created sale in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        try {
            // Validate the request
            $validator = Validator::make($request->all(), [
                'items' => 'required|array|min:1',
                'items.*.item_id' => 'required|exists:items,id',
                'items.*.quantity' => 'required|integer|min:1',
                'payment_method' => 'required|string|in:cash,card,mobile_money',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            DB::beginTransaction();

            // Calculate total amount
            $totalAmount = 0;
            $saleItems = [];

            foreach ($request->items as $itemData) {
                $item = Item::findOrFail($itemData['item_id']);
                
                // Check if sufficient stock is available
                if ($item->quantity < $itemData['quantity']) {
                    DB::rollBack();
                    return response()->json([
                        'error' => 'Insufficient stock for item: ' . $item->name
                    ], 400);
                }

                $unitPrice = $item->price;
                $totalPrice = $unitPrice * $itemData['quantity'];
                $totalAmount += $totalPrice;

                $saleItems[] = [
                    'item_id' => $item->id,
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $unitPrice,
                    'total_price' => $totalPrice,
                ];
            }

            // Create the sale
            $sale = Sale::create([
                'user_id' => $request->user()->id,
                'total_amount' => $totalAmount,
                'payment_method' => $request->payment_method,
                'status' => 'completed',
            ]);

            // Create sale items and update inventory
            foreach ($saleItems as $saleItemData) {
                SaleItem::create(array_merge($saleItemData, ['sale_id' => $sale->id]));

                // Update item quantity
                $item = Item::find($saleItemData['item_id']);
                $item->quantity -= $saleItemData['quantity'];
                $item->save();
            }

            DB::commit();

            // Log sale activity
            Activity::create([
                'type' => 'sale',
                'item' => 'Sale #' . $sale->id,
                'details' => 'Sale completed - Total: $' . number_format($totalAmount, 2),
                'user_id' => $request->user()->id,
                'synced' => true,
            ]);

            // Load relationships for response
            $sale->load('items.item');

            return response()->json($sale, 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to create sale: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Display a listing of the sales.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        $sales = Sale::with('items.item')->orderBy('created_at', 'desc')->get();
        return response()->json($sales);
    }

    /**
     * Display the specified sale.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        $sale = Sale::with('items.item')->findOrFail($id);
        return response()->json($sale);
    }
}
