define(['jquery', 'system', 'js_validate', 'i18n'], function($, _system, jsvalidate, i18n) {
    'use strict';

    var partialCache;

    console.log('load partition');
    var page = {
        view: '#advanced_part_tmpl',
        locals : null,
        options:null,
        record: {},

        initialize: function (options, locals) {
            this.options = options;
            this.locals = locals;
            this.options.installmode = "advanced";
            this.record = {
                edit: [],
                dirty: [],
            };
        },
         
        // compile and return page partial
        loadView: function() {
            this.locals = this.locals || {};
            partialCache = (jade.compile($(this.view)[0].innerHTML))(this.locals);
            return partialCache;
        },
        renderParts: function () {
            this.locals = this.locals || {};
            var pageC = (jade.compile($("#part_partial_tmpl")[0].innerHTML))(this.locals);
            $('#advanced_part_table').html(pageC);
            this.renderPart();
        },

        renderPart: function () {
            var that = this;
            var tys, pindex, $disk, tmpPage, args, dindex = 0;
            tys = ["primary", "free", "extended"];//logical is special
            _.each(that.options.disks, function (disk) {
                pindex = 0;
                $disk = $('ul.disk[dpath="'+disk.path+'"]');
                _.each(disk.table, function (part){
                    part["path"] = disk.path;
                    args = {
                                pindex:pindex, 
                                dindex:dindex,
                                part:part,
                                unit:disk.unit,
                            };
                    args["gettext"] = that.locals.gettext;
                    if (part.number < 0) {
                        tmpPage = (jade.compile($('#free_part_tmpl')[0].innerHTML))(args);
                    }else{
                        tmpPage = (jade.compile($('#'+part.ty+'_part_tmpl')[0].innerHTML))(args);
                    };
                    if (_.indexOf(tys, part.ty) > -1) {
                        $disk.append(tmpPage);
                    }else {
                        $disk.find('ul.logicals').append(tmpPage);
                    };
                    pindex++;
                });
                dindex++;
            });
        },

        postSetup: function() {
            this.renderParts();
            $('body').off('click','.delete');
            $('body').off('click','#reset');
            $('body').off('click','.js-create-submit');
            $('body').off('click','.js-edit-submit');

            var that = this;
            $('body').on('click','.delete', function () {
                var $this = $(this);
                window.apis.services.partition.rmpart(
                    $this.attr("path"), $this.attr("number"),
                    $.proxy(that.partflesh, that));
            });

            $('body').on('click','#reset',function () {
                that.record = {
                    edit:[],
                    dirty:[],
                };
                window.apis.services.partition.reset(
                    $.proxy(that.partflesh, that));
            });

            $('body').on('click','a.js-create-submit',function () {
                var size, parttype, fstype, start, end, path;
                var $modal = $(this).parents('.modal');
                size = Number($modal.find("#size").attr("value"));
                parttype = $modal.find('#parttype :checked').attr("value");
                fstype = $modal.find('#fs :checked').attr("value");

                path = $(this).attr("path");
                if($modal.find("#location :checked").attr("id") === "start") {
                    start = Number($modal.find("#location :checked").attr("value"));
                    end = start + size;
                } else if ($modal.find("#location :checked").attr("id") === "end") {
                    end = Number($modal.find("#location :checked").attr("value"));
                    start = end - size;
                };
                window.apis.services.partition.mkpart(
                    path, parttype, start, end, fstype, $.proxy(that.partflesh, that));
            });

            $('body').on('click','a.js-edit-submit',function () {
                var mp, fstype, path, number;
                var $modal = $(this).parents('.modal');
                path = $(this).attr("path");
                number = $(this).attr("number");
                fstype = $modal.find("#fs :checked").attr("value");
                mp = $modal.find("#mp :checked").attr("value");

                that.record.edit = _.reject(that.record.edit,function(el){
                    return (el.path === path && el.number === number);
                });
                that.record.edit.push({"path":path,
                                        "number":number,
                                        "fs": fstype,
                                        "mp": mp,});
                $(this).parents('ul.part').find('a.partfs').text(fstype);
                $(this).parents('ul.part').find('a.partmp').text("MountPoint:" + mp);
            });
        },

        partflesh: function(result){
            var that = this;
            console.log(result);
            if (result.status === "success") {
                if (result.handlepart){
                    //result.handlepart ="add/dev/sda1" or "del/dev/sdb1"
                    var method, path, number;
                    method = result.handlepart.substring(0,3);
                    path = result.handlepart.substring(3,11);
                    number = Number(result.handlepart.substring(11));

                    if (method === "add") {
                        //TODO ty==extended
                        that.record.dirty.push({"path":path,"number":number});

                    }else if (method === "del") {
                        //TODO ty==extended
                        that.record.dirty = _.reject(that.record.dirty, function(el) {
                            return el.path === path && el.number === number;
                        });
                        that.record.edit = _.reject(that.record.edit,function(el){
                            return el.path === path && el.number === number;
                        });
                        if(number > 4) {
                            that.record.edit = _.map(that.record.edit,function(el){
                                if (el.number > number && el.path === path) {
                                    el.number--;
                                };
                                return el;
                            })
                        }
                    }
                }
                window.apis.services.partition.getPartitions(function(disks) {
                    that.options.disks = disks;
                    that.locals["disks"] = that.options.disks;
                    var pageC = (jade.compile($("#part_partial_tmpl")[0].innerHTML))(that.locals);
                    $("#advanced_part_table").html(pageC);
                    that.renderPart();

                    for (var x in that.record.edit) {
                        var tmp = that.record.edit[x];
                        var $part = $('ul.disk[dpath="'+tmp.path+'"]').find('ul.part[number="'+tmp.number+'"]');
                        if(tmp.fs !== "") {
                            $part.find('a.partfs').text(tmp.fs);
                        };
                        if (tmp.mp !== ""){
                            $part.find('a.partmp').text("MountPoint:" + tmp.mp);
                        };
                    };
                });
            }else if(result.status === "failure") {
                //TODO
                alert(i18n.gettext(result.reason));
                console.log(result.reason);
            }else {
                //TODO
                alert(i18n.gettext(result.error));
                console.log(result);
            };
        },
    };
    return page;
});

