<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'category_id',
        'barcode',
        'quantity',
        'price',
        'currency',
        'image_url',
        'image_urls',
        'form_data'
    ];

    protected $casts = [
        'image_urls' => 'array',
        'form_data' => 'array',
        'quantity' => 'integer',
        'price' => 'float'
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
