$(function(){

var api_url = '../api/v0/design/get-designs'
$.ajax({
    type:'GET',
    url: api_url,

    cache:false,
    contentType: false,
    processData: false,

    success:function(data){
        console.log(data);
        render(data.result);
        $('.initialprogress').hide();


    },

    error: function(data){
        console.log(data);
    }
});

$('.designs_table tbody').on('click', 'tr', function(e) {
    var id = $(this).find('.td_id').html();
    window.location='editor.html#'+id
})



$("#uploadbutton").click(function(e) {

    $('#uploadform .submit-btn').click();
    e.preventDefault();

});


// $('#fileupload').change(function (e) {

//     $("#uploadform").submit();
//     e.preventDefault();

// });

$('#uploadform').submit(function(e) {

    $('#uploadform').toggle();
    $('#uploadprogress-container').toggle();
    $("#uploadbutton").attr('disabled', 'true');
    e.preventDefault();
    var formData = new FormData(this);
    var postUrl = $(this).attr('action');
    $.ajax({
        type:'POST',
        url: postUrl,
        data:formData,
        xhr: function() {
                var myXhr = $.ajaxSettings.xhr();
                if(myXhr.upload){
                    myXhr.upload.addEventListener('progress',progress, false);
                }
                return myXhr;
        },
        cache:false,
        contentType: false,
        processData: false,

        success:function(data){
            console.log(data);
            if (data.ok == false) {
                alert(data.status);
                $('#uploadform').toggle();
                $('#uploadprogress-container').toggle();
                $("#uploadbutton").removeAttr('disabled');
            } else {
                $('#uploadprogress-container .progress-bar').removeClass('progress-bar-animated');
                $('#processprogress-container').toggle();
                processProgress(data.id);
            }

        },

        error: function(data){
            console.log(data);
        }
    });

    e.preventDefault();

});


})

function progress(e){
    if(!e.lengthComputable) return;
    var max = e.total;
    var current = e.loaded;

    var Percentage = (current * 100)/max;
    console.log(Percentage);

    $('#uploadprogress-container .progress-bar').css('width', Percentage+'%');
    $('#uploadprogresspercentage').html(Math.round(Percentage)+'%');

    if(Percentage >= 100)
    {
       // process completed  
    }
}

function processProgress(designId) {
    processprogressbar = $('#processprogress-container .progress-bar');
    console.log(processprogressbar.width())
    processprogressbar.css('width', processprogressbar.width() + 12);
    setTimeout(function() {
        var api_url = '../api/v0/design/get-design/' + designId

        $.ajax({
            type:'GET',
            url: api_url,

            cache:false,
            contentType: false,
            processData: false,

            success:function(data){
                console.log(data);
                if (data.result.data == null) {
                    processProgress(designId);
                } else {
                    processprogressbar.css('width', '100%');
                    window.location = 'editor.html#'+data.result.id;
                }

            },

            error: function(data){
                console.log(data);
            }
        });
    }, 7000);
}


function render(data) {
    tbl = $('.designs_table');
    tr = $('.designs_table tbody tr');
    $(data).each(function(i,d) {
        var row = tr.clone();
        row.find('.td_id').html(d.id);
        row.find('.td_title').html(d.title);
        row.find('.td_file_name').html(d.file_name);
        row.find('.td_layer_count').html(d.layer_count);
        row.find('.td_width').html(d.width+'px');
        row.find('.td_height').html(d.height+'px');
        row.show();
        tbl.find('tbody').append(row);
    })
    tbl.show();
}