<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ActivityController extends Controller
{
    /**
     * Get recent activity (inventory-related only)
     *
     * @return JsonResponse
     */
    public function recent(): JsonResponse
    {
        // Get activities from activities table (inventory-related)
        $dbActivities = Activity::whereIn('type', [
            'added', 
            'updated', 
            'deleted', 
            'stocked',
            'category_added',
            'category_updated',
            'category_deleted',
            'stock_update'
        ])
        ->with('user')
        ->orderBy('created_at', 'desc')
        ->take(20)
        ->get();

        // Also get recent item updates
        $recentItems = Item::with('category')
            ->orderBy('updated_at', 'desc')
            ->take(10)
            ->get();

        // Format item updates as activities
        $itemActivities = $recentItems->map(function ($item) {
            return [
                'id' => 'item-' . $item->id,
                'type' => 'item_updated',
                'item' => $item->name,
                'details' => 'Item information updated',
                'user_id' => null,
                'user_name' => null,
                'created_at' => $item->updated_at,
                'synced' => true,
            ];
        });

        // Merge and sort all activities
        $allActivities = collect($dbActivities->map(function ($activity) {
            return [
                'id' => $activity->id,
                'type' => $activity->type,
                'item' => $activity->item,
                'details' => $activity->details,
                'user_id' => $activity->user_id,
                'user_name' => $activity->user ? $activity->user->name : null,
                'created_at' => $activity->created_at,
                'synced' => $activity->synced,
            ];
        }))->merge($itemActivities);

        // Sort by created_at and take top 20
        $sorted = $allActivities->sortByDesc('created_at')->take(20)->values();

        return response()->json($sorted);
    }

    /**
     * Get all activities (admin only)
     *
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        $activities = Activity::with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($activities);
    }

    /**
     * Batch store activities from offline sync
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function batchStore(Request $request): JsonResponse
    {
        $activities = $request->validate([
            'activities' => 'required|array',
            'activities.*.type' => 'required|string',
            'activities.*.item' => 'required|string',
            'activities.*.user' => 'nullable|string',
            'activities.*.details' => 'nullable|string',
        ]);

        $saved = [];
        foreach ($activities['activities'] as $activityData) {
            $userId = $request->user()->id;
            
            // Try to find user by name if provided
            if (!empty($activityData['user'])) {
                $user = \App\Models\User::where('name', $activityData['user'])->first();
                if ($user) {
                    $userId = $user->id;
                }
            }

            $activity = Activity::create([
                'type' => $activityData['type'],
                'item' => $activityData['item'],
                'details' => $activityData['details'] ?? null,
                'user_id' => $userId,
                'synced' => true,
            ]);

            $saved[] = $activity;
        }

        return response()->json([
            'message' => 'Activities saved successfully',
            'saved' => count($saved),
        ]);
    }
}
