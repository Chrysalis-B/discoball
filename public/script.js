(function() {
    var canv = $("#canv");
    if (!canv.length) {
        return;
    }
    var canvas = document.getElementById("canv");
    var ctx = canvas.getContext("2d");

    var signature = $('input[name="signature"]');

    canv.on("mousedown", function(e) {
        console.log(e);
        e.stopPropagation();
        var x = e.offsetX;
        var y = e.offsetY;
        ctx.strokeStyle = "fuchsia";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        canv.on("mousemove", function(e) {
            e.stopPropagation();
            console.log(e);
            var x = e.offsetX;
            var y = e.offsetY;
            ctx.lineTo(x, y);
            ctx.stroke();
            signature.val(canvas.toDataURL());
        });
    });

    $(document).on("mouseup", function() {
        canv.off("mousemove");
    });

    $("#clear").on("click", function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
})();
