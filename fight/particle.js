class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; 
        this.life = 1.0;
        if (type === 'leaf') {
            this.vx = Math.random() * 2 - 1;
            this.vy = Math.random() * 1 + 0.5;
            this.size = Math.random() * 5 + 3;
            this.rot = Math.random() * 360;
            this.rotSpd = Math.random() * 5 - 2.5;
            this.color = (Math.random() > 0.5) ? '#81c784' : '#4caf50'; 
        } else if (type === 'dust') {
            this.vx = (Math.random() - 0.5) * 4;
            this.vy = -Math.random() * 2;
            this.size = Math.random() * 8 + 4;
            this.color = 'rgba(200, 200, 200, 0.5)';
        } else {
            this.vx = (Math.random() - 0.5) * 10;
            this.vy = (Math.random() - 0.5) * 10;
            this.size = Math.random() * 4 + 2;
            this.color = '#fff';
        }
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.03;
        if (this.type === 'leaf') {
            this.rot += this.rotSpd;
            if (this.y > 600) this.y = -10; 
            if (this.life < 0) this.life = 1.0; 
        } else if (this.type === 'dust') {
            this.size *= 0.95;
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.translate(this.x, this.y);
        if (this.type === 'leaf') {
            ctx.rotate(this.rot * Math.PI / 180);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        } else if (this.type === 'dust') {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI*2);
            ctx.fill();
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        }
        ctx.restore();
    }
}