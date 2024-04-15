<?php

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

use Intervention\Image\ImageManager as InterventionImageManager;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/info', function () {
    $imanager = new InterventionImageManager(array('driver' => 'gd'));
    $img = $imanager->make('12.jpg');
    $img->crop(100,100, 10, 200);
    $img->save();

});

