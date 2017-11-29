var Face = {
  eye: {
    normal: function(x, y, w, r, d,l, ctx) {
      ctx.beginPath();
      ctx.lineWidth = 3;
      var r = w / 2 * 0.2
      ctx.arc(x,y,r,0,2*Math.PI);
      ctx.fillStyle = "white";
      ctx.stroke();
      ctx.fill();
      this.pupil.normal(x, y, r, d, l, ctx);
    },
    pupil: {
      normal: function(x, y, r, d,l, ctx) {
        ctx.beginPath();
        var pr = r - (0.3 * r);
        pr = pr <= pr / l ? pr * l: pr;
        var xp = pr * Math.cos(d) + x;
        var yp = pr * Math.sin(d) + y;
        ctx.arc(xp, yp, r * 0.3, 0, 2*Math.PI);
        ctx.fillStyle = "black";
        ctx.stroke();
        ctx.fill();
      },
      opposite: function(x, y, r, d,l, ctx) {
        ctx.beginPath();
        var pr = r - (0.3 * r);
        var xp = pr * -Math.cos(d) + x;
        var yp = pr * -Math.sin(d) + y;
        ctx.arc(xp, yp, r * 0.3, 0, 2*Math.PI);
        ctx.fillStyle = "black";
        ctx.stroke();
        ctx.fill();
      },
    },
  },
  mouth: {
    line: function(x1, x2, y1, y2, ctx) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      // graph.bezierCurveTo(x1, y1 + (r*0.5), x2, y1 + (r *0.5), x2, y2)
      ctx.stroke();
    },
    happy: function(x1, x2, y1, y2, ctx) {
      ctx.beginPath();
      var r = (x1-x2)/2
      if (r < 0 ) {
        r = r * -1
      }
      var x = (x2+x1)/2
      ctx.lineWidth = 5;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.arc(x, y1, r, 0, Math.PI)
      ctx.fillStyle = "pink";
      ctx.stroke();
      ctx.fill();
      this.tongue.normal(x, r )
    },
    tongue:{
      normal: function(){

      }
    },
  },
}

module.exports = Face;
