<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateDesignsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('designs', function (Blueprint $table) {
            $table->increments('id');
            $table->string('title', 500);
            $table->string('file_name', 500);
            $table->string('file_path', 500);
            $table->integer('width')->nullable();;
            $table->integer('height')->nullable();;
            $table->integer('q_job_id')->nullable();;
            $table->integer('layer_count')->nullable();;
            $table->mediumText('data_json')->nullable();;  
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('designs');
    }
}
