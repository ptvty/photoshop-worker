"use strict"

let tenant = null;
let task = {};
let helper = {};

helper.config = {
    mockResourceUrl: '../api/mocks',
    artworkResourceUrl: '../api/artworks',
    taskResourceUrl: '../api/tasks?v=1',
}

helper.toggleSelectThumb = (thumbContainer, cb) => {
    thumbContainer.toggleClass('thumb-container-selected');
    cb(thumbContainer.parents('.thumbs-container'));
} 

helper.selectAllThumb = (thumbsContainer, cb) => {
    thumbsContainer.find('.thumb-container-selectable').addClass('thumb-container-selected');
    cb(thumbsContainer);
} 

helper.deselectAllThumb = (thumbsContainer, cb) => {
    thumbsContainer.find('.thumb-container-selectable').removeClass('thumb-container-selected');
    cb(thumbsContainer);
} 

helper.getSelectedIds = (thumbsContainer) => {
    let selectedIds = [];
    thumbsContainer.find('.thumb-container-selectable.thumb-container-selected').not('.tmplt').each(function () {
        selectedIds.push(($(this)).data('id'));
    });
    return selectedIds;
} 

helper.onThumbsSelectionChanged = (thumbContainer) => {
    let selectedIds = helper.getSelectedIds(thumbContainer);
}

helper.addLoadingThumbContainer = (thumbsContainer) => {
    let thumbContainer = thumbsContainer.find('.thumb-container-loading').first().clone().css('display', 'block');
    thumbsContainer.find('.thumb-container-blank').after(thumbContainer);
    return thumbContainer;
}

helper.uploadDialog = (contentType, multiple) => {
    return new Promise(resolve => {
        let input = document.createElement('input');
        input.type = 'file';
        input.multiple = multiple;
        input.accept = contentType;

        input.onchange = _ => {
            let files = Array.from(input.files);
            if (multiple)
                resolve(files);
            else
                resolve(files[0]);
        };
        input.click();
    });
}

/**
 * Format bytes as human-readable text.
 * 
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use 
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 * 
 * @return Formatted string.
 */
helper.humanFileSize = function humanFileSize(bytes, si=false, dp=1) {
    const thresh = si ? 1000 : 1024;
  
    if (Math.abs(bytes) < thresh) {
      return bytes + ' B';
    }
  
    const units = si 
      ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] 
      : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    let u = -1;
    const r = 10**dp;
  
    do {
      bytes /= thresh;
      ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);
  
  
    return bytes.toFixed(dp) + ' ' + units[u];
}
  

helper.postFileAjax = (file, url, thumbContainer) => {
    let formData = new FormData();
    formData.append('file',file);
    formData.append('title',file.name);
    let progress = helper.postFileAjaxProgress;
    let postUrl = url + '?tenant=' + tenant;
    $.ajax({
        type:'POST',
        url: postUrl,
        data:formData,
        xhr: function() {
                var myXhr = $.ajaxSettings.xhr();
                if(myXhr.upload){
                    myXhr.upload.addEventListener('progress',(e)=>progress(e, thumbContainer), false);
                }
                return myXhr;
        },
        cache:false,
        contentType: false,
        processData: false,

        success:function(data){
            let trackUrl = url + '/' + data.id + '?tenant=' + tenant;
            helper.trackProccess(thumbContainer, trackUrl);
        },

        error: function(data){
            console.log(data);
            helper.replaceWithErrorContainer(thumbContainer);
        }
    });
}

helper.postFileAjaxProgress = (e, thumbContainer) => {
    if(!e.lengthComputable) return;
    var total = helper.humanFileSize(e.total, true);
    var loaded = helper.humanFileSize(e.loaded, true);    
    let labelText = `${loaded} / ${total}...`;
    thumbContainer.find('.thumb-label').html(labelText);

}

helper.replaceWithErrorContainer = (thumbContainer) => {
    let errorContaienr = thumbContainer.parents('.thumbs-container').find('.thumb-container-error.tmplt').clone();
    errorContaienr.removeClass('tmplt').css('display', 'block');
    thumbContainer.replaceWith(errorContaienr);
}

helper.trackProccess = (thumbContainer, url) => {
    let cb = (data) => {
        if (data.status == 'done') {
            helper.replaceWithSelectableContainer(thumbContainer, data);
        } else if (data.status == 'error') {
            helper.replaceWithErrorContainer(thumbContainer);
        } else if (data.status == 'proccessing') {
            helper.trackProccess(thumbContainer, url);
        }
    };
    setTimeout(() => {
        helper.getStatusAjax(url, cb);
    }, 3000);
    let proccessingText = `Proccessing...`;
    thumbContainer.find('.thumb-label').html(proccessingText);
}

helper.getStatusAjax = (url, cb,) => {
    $.ajax({
        type:'GET',
        url: url,

        cache:false,
        contentType: false,
        processData: false,

        success:function(result){
            cb(result);
        },

        error: function(data){
            console.log(data);
        }
    });

}

helper.getAjax = url => {
    let tenantQuery = (url.indexOf('?') == -1) ? '?tenant=' : '&tenant=';
    return $.ajax({
        url: url + tenantQuery + tenant,
        type: 'GET',
    });
}

helper.addThumbContainer = (thumbsContainer, id, label, thumbUrl) => {
    let thumbEl = thumbsContainer.find('.thumb-container-selectable.tmplt').clone();
    thumbEl.removeClass('tmplt').css('display', 'block');
    thumbEl.data('id', id);
    thumbEl.find('.thumb-label').html(label);
    thumbEl.find('.thumb-image').css('background-image', `url('${thumbUrl}')`);
    thumbEl.find('.thumb-image').attr('href', thumbUrl);

    thumbEl.appendTo(thumbsContainer);
    return thumbEl;
}

helper.replaceWithSelectableContainer = (thumbContainer, data) => {
    console.log(data);
    let title = data.title;
    let imageUrl = data.thumb_url;
    let id = data.id;
    let selectableThumbContainer = thumbContainer.parents('.thumbs-container').find('.thumb-container-selectable.tmplt').clone();
    selectableThumbContainer.removeClass('tmplt').css('display', 'block');
    selectableThumbContainer.find('.thumb-label').html(title);
    selectableThumbContainer.find('.thumb-image').css('background-image', `url('${imageUrl}')`);
    selectableThumbContainer.find('.thumb-image').attr('href', imageUrl);
    selectableThumbContainer.data('id', id);
    // selectableThumbContainer.addClass('thumb-container-selected');
    thumbContainer.replaceWith(selectableThumbContainer);
}

helper.switchToCard = (card) => {
    $('.card').hide();
    $(`.card-${card}`).fadeIn();
}

helper.sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

helper.convertArrayToObject = (array, key) => {
    const initialValue = {};
    return array.reduce((obj, item) => {
        return {
        ...obj,
        [item[key]]: item,
        };
    }, initialValue);
};

helper.trackAllProccess = async (thumbsContainer, url) => {
    for (let tries = 0; tries < 100; tries++) {
        let thumbs = thumbsContainer.find('.thumb-container').not('.tmplt');    
        await helper.sleep(3e3);
        let response = await helper.getAjax(url);
        let result = helper.convertArrayToObject(response.result, 'id');
        let doneCount = 0;
        thumbs.each( (i, thumb) => {
            thumb = $(thumb);
            console.log(thumbs)
            let thumbId = thumb.data('id');
            let task = result[thumbId];
            console.log(result);
            thumb.find('.thumb-image').css('background-image', `url('${task.thumb_url}')`);
            thumb.find('.thumb-image').attr('href', task.thumb_url);
            if (task.status == 'done') {
                thumb.removeClass('thumb-container-proccessing');
                thumb.addClass('thumb-container-selectable');
                doneCount++;
            }
        })
        if (doneCount >= response.result.length) {
            break;
        }
    }
}

helper.switchToCard = (card) => {
    $('.card').hide();
    $(`.card-${card}`).fadeIn();
}

let initThumbsContainer = async (thumbsContainer, resourceUrl, callback, config) => {
    // let thumbsContainer = $('.mock-thumbs-container');
    let onChangeCallback = (thumbContainer) => {
        let selectedIds = helper.getSelectedIds(thumbContainer);
        let selectedCount = selectedIds.length;
        let btnText = (config && config.btnTextDefault)?config.btnTextDefault: `Select an item to continue`
        let submitBtn = thumbsContainer.parents('.card').find('.btn-submit-selected-items');
        submitBtn.removeAttr('disabled');
        if (selectedCount == 1) {
            btnText = `One Item selected. Click to continue`
        }
        if (selectedCount > 1) {
            btnText = `${selectedCount} Items selected. Click to continue`
        }
        if (selectedCount < 1) {
            submitBtn.attr('disabled', 'true');
        }
        submitBtn.html(btnText);
    }

    thumbsContainer.on('click', '.thumb-container-selectable', function () {
        helper.toggleSelectThumb($(this), onChangeCallback);
    });

    thumbsContainer.on('click', '.thumb-container-deletable .badge-delete', function (e) {
        e.stopPropagation();
        $(this).parents('.thumb-container-deletable').fadeOut('fast', ()=>{$(this).remove()})
    });    
    
    thumbsContainer.on('click', '.thumb-container-viewable .badge-view', function (e) {
        e.stopPropagation();
        let href = $(this).parents('.thumb-container').find('.thumb-image').attr('href');
        $.colorbox({maxWidth:"90%",maxHeight:"90%", open:true, href:href});
    });    
    
    thumbsContainer.on('click', '.thumb-container-error', function (e) {
        $(this).remove();
    });

    let buttonsContainer = thumbsContainer.parents('.card').find('.card-header');

    buttonsContainer.on('click', '.btn-select-all-items', function (e) {
        helper.selectAllThumb(thumbsContainer, onChangeCallback);
        buttonsContainer.find('.btn-select-all-items, .btn-deselect-all-items').toggle();
    });

    buttonsContainer.on('click', '.btn-deselect-all-items', function (e) {
        helper.deselectAllThumb(thumbsContainer, onChangeCallback);
        buttonsContainer.find('.btn-select-all-items, .btn-deselect-all-items').toggle();
    });

    buttonsContainer.on('click', '.btn-enable-deletable-items', function (e) {
        thumbsContainer.find('.thumb-container-selectable').addClass('thumb-container-deletable');
        buttonsContainer.find('.btn-disable-deletable-items, .btn-enable-deletable-items').toggle();
    });

    buttonsContainer.on('click', '.btn-disable-deletable-items', function (e) {
        thumbsContainer.find('.thumb-container-selectable').removeClass('thumb-container-deletable');
        buttonsContainer.find('.btn-disable-deletable-items, .btn-enable-deletable-items').toggle();
    });

    buttonsContainer.on('click', '.btn-submit-selected-items', function (e) {
        let selectedIds = helper.getSelectedIds(thumbsContainer);
        thumbsContainer.data('selectedIds', selectedIds);
        callback(selectedIds);
    });

    thumbsContainer.find('.thumb-container-blank').on('click', function () {
        helper.uploadDialog(null, true).then((files) => {
            $(files).each((i) => {
                let file = files[i];
                let url = resourceUrl;
                let thumbContainer = helper.addLoadingThumbContainer(thumbsContainer);
                helper.postFileAjax(file, url, thumbContainer);
            });
        });
    });
    let url = resourceUrl;
    let thumbs = await helper.getAjax(url);
    thumbs.result.forEach(mock => {
        if (mock.status == 'done') {
            helper.addThumbContainer(thumbsContainer, mock.id, mock.title, mock.thumb_url);
        }
        if (mock.status == 'proccessing') {
            let proccessingEl = helper.addThumbContainer(thumbsContainer, mock.id, mock.title, mock.thumb_url);
            proccessingEl.addClass('thumb-container-proccessing').removeClass('thumb-container-selectable')
        }
    });
    thumbsContainer.siblings('.spinner-items-loading').hide();  
    thumbsContainer.fadeIn();
}

let initTenant = () => {
    tenant = window.localStorage.getItem('tenant');
    let switchToCard = (card) => {
        $('.card').hide();
        $(`.card-${card}`).fadeIn();
    }
    if (null != tenant) {
        $('.card-tenant').hide();
        $('.card-mocks, .btn-reset-tenant').fadeIn();
        $('.span-tenant').html(tenant);
        initThumbsContainer($('.mock-thumbs-container'), helper.config.mockResourceUrl, ()=>switchToCard('artworks'));
        initThumbsContainer($('.artwork-thumbs-container'), helper.config.artworkResourceUrl, ()=>switchToCard('replacement'));
    } else {
        $('.card-mocks, .card-artworks, .card-results').hide();
        $('.card-tenant').show();
        $('.card-tenant .spinner-items-loading').show();
        setTimeout(()=>{
            $('.card-tenant .spinner-items-loading').hide();
            $('.card-tenant .tenant-id-form').fadeIn();
        }, 2000);
    }
    $('.btn-reset-tenant').click(()=>{
        window.localStorage.removeItem('tenant');
        window.location.reload();
    })
    $('.btn-submit-tenant-id').click(()=>{
        tenant = $('.card-tenant input').val();
        window.localStorage.setItem('tenant', tenant);
        $('.card-tenant').hide();
        $('.card-mocks, .btn-reset-tenant').fadeIn();
        $('.span-tenant').html(tenant);
        initThumbsContainer($('.mock-thumbs-container'), helper.config.mockResourceUrl, ()=>switchToCard('artworks'));
        initThumbsContainer($('.artwork-thumbs-container'), helper.config.artworkResourceUrl, ()=>switchToCard('replacement'));
    })
    $('.card-tenant input').keyup((e)=>{
        if ($(e.currentTarget).val() == '') {
            let btnText = `Enter tenant ID to continue`;
            $('.card-tenant .btn-submit-tenant-id').html(btnText).attr('disabled', 'true');
        } else {
            let btnText = `Click to continue`;
            $('.card-tenant .btn-submit-tenant-id').html(btnText).removeAttr('disabled');
        }
    })    
}

let postTaskAjax = (task, url) => {
    return $.ajax({
        url: url,
        data: JSON.stringify(task),
        type: 'POST',
    });
}

$(function(){

    initTenant();

    let replacmentTypeContainer = $('.replacment-type-thumbs-container');
    let onReplacmentTypeChangeCallback = () => {
        let types = helper.getSelectedIds(replacmentTypeContainer);
        if (types.length < 1) {
            let btnText = `Select the type to continue`;
            $('.card-replacement .btn-submit-selected-items').html(btnText).attr('disabled', 'true');
        } else {
            let btnText = `Click to continue`;
            $('.card-replacement .btn-submit-selected-items').html(btnText).removeAttr('disabled');
        }
    }
    replacmentTypeContainer.on('click', '.thumb-container-selectable', function () {
        helper.deselectAllThumb(replacmentTypeContainer, ()=>{});
        helper.toggleSelectThumb($(this), onReplacmentTypeChangeCallback);
    });
    $('.card-replacement').on('click', '.btn-submit-selected-items', async ()=>{
        let task = {
            replacement: helper.getSelectedIds(replacmentTypeContainer)[0],
            mocks: helper.getSelectedIds($('.mock-thumbs-container')),
            artworks: helper.getSelectedIds($('.artwork-thumbs-container')),
        };
        console.log(task);
        helper.switchToCard('results');
        let resultThumbs = $('.result-thumbs-container');
        let taskUuid = await postTaskAjax(task, helper.config.taskResourceUrl + '&tenant=' + tenant);
        let url = helper.config.taskResourceUrl + '&uuid=' + taskUuid;
        initThumbsContainer(resultThumbs, url, (selectedIds)=>{
            //redirect to zip download
            let url = helper.config.taskResourceUrl + '&view=zip&id=' + selectedIds.join(',') + '&uuid=' + taskUuid
            console.log(url);
            window.open(url, '_blank');
        }, {btnTextDefault: 'Select items to downlaod'});
        helper.trackAllProccess(resultThumbs, url);

    });

});