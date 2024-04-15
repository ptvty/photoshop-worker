<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddTenantToMocksTableArtworksTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('mocks', function (Blueprint $table) {
            $table->text('tenant')->nullable();
        });
		
        Schema::table('artworks', function (Blueprint $table) {
            $table->text('tenant')->nullable();
        });
		
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('mocks', function (Blueprint $table) {
            $table->dropColumn('tenant');
        });
		
        Schema::table('artworks', function (Blueprint $table) {
            $table->dropColumn('tenant');
        });
		
    }
}
