<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * Get all users (admin only).
     *
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        $users = User::orderBy('created_at', 'desc')->get();
        return response()->json($users);
    }

    /**
     * Get single user (admin only).
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        return response()->json($user);
    }

    /**
     * Update user role (admin only).
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function updateRole(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'role' => 'required|in:admin,attendant',
        ]);

        $user = User::findOrFail($id);
        $user->update([
            'role' => $request->role,
        ]);

        // Log activity
        Activity::create([
            'type' => 'role_change',
            'item' => 'User Role',
            'details' => 'User ' . $user->name . ' role changed to ' . $request->role,
            'user_id' => $request->user()->id,
            'synced' => true,
        ]);

        return response()->json([
            'message' => 'User role updated successfully',
            'user' => $user,
        ]);
    }

    /**
     * Create new user (admin only).
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|in:admin,attendant',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'role' => $request->role,
        ]);

        // Log activity
        Activity::create([
            'type' => 'user_created',
            'item' => 'User Created',
            'details' => 'New user ' . $user->name . ' created with role ' . $user->role,
            'user_id' => $request->user()->id,
            'synced' => true,
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    /**
     * Delete user (admin only).
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        // Log activity before deletion
        Activity::create([
            'type' => 'user_deleted',
            'item' => 'User Deleted',
            'details' => 'User ' . $user->name . ' was deleted',
            'user_id' => $request->user()->id,
            'synced' => true,
        ]);

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    /**
     * Get total user count (admin only).
     *
     * @return JsonResponse
     */
    public function count(): JsonResponse
    {
        $total = User::count();
        $admins = User::where('role', 'admin')->count();
        $attendants = User::where('role', 'attendant')->count();

        return response()->json([
            'total' => $total,
            'admins' => $admins,
            'attendants' => $attendants,
        ]);
    }
}
