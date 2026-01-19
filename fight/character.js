const GRAVITY = 0.8;
const GROUND_Y = 450;

const STATE = { IDLE: 0, RUN: 1, ATTACK: 2, BLOCK: 3, HIT: 4, DODGE: 5, DEAD: 6, SPECIAL: 7, RETREAT: 8, WIN: 9 };

function drawEllipse(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
}

class ChibiFighter {
    constructor(x, y, isP1, name, type, customStats) {
        this.startX = x;
        this.startY = y;
        this.x = x;
        this.y = y;
        this.isP1 = isP1;
        this.name = name;
        this.type = type || 'wolf';

        this.level = 1;
        this.stats = { str: 10, agi: 10, tec: 10 };
        this.exp = 0;
        this.maxExp = 100;
        this.points = 0;

        this.initStatsByType();

        if (customStats) {
            this.level = customStats.level;
            this.exp = customStats.exp;
            this.maxExp = customStats.maxExp;
            this.points = customStats.points;
            this.stats = { ...customStats.stats };
            this.isBoss = customStats.isBoss || false;
        }

        this.maxHp = 100 + (this.stats.str * 5) + (this.level * 20);
        if (this.isBoss) {
            this.maxHp *= 2;
        }
        this.hp = this.maxHp;

        this.facing = isP1 ? 1 : -1;
        this.state = STATE.IDLE;
        this.vx = 0;
        this.vy = 0;
        this.width = 60;
        this.height = 90;
        this.animFrame = 0;
        this.alpha = 1.0;
        this.isCrit = false;

        // Buffs system
        this.buffs = {
            forceCombo: false,
            forceCrit: false,
            forceBlock: false,
            forceDodge: false,
            atkMultiplier: 1.0, // New base stat
            agiMultiplier: 1.0, // New AGI stat
            strBonusMultiplier: 0 // 力量傷害加成 (e.g., 0.5 for 50%)
        };

        this.holdingWeapon = null; // New: Weapon holding state
    }

    initStatsByType() {
        if (this.type === 'wolf') {
            this.stats = { str: 18, agi: 25, tec: 15 };
        } else if (this.type === 'girl') {
            this.stats = { str: 28, agi: 12, tec: 10 };
        }
        else if (this.type === 'villain_1') {
            this.level = 3;
            this.stats = { str: 12, agi: 15, tec: 12 };
        } else if (this.type === 'villain_2') {
            this.level = 6;
            this.stats = { str: 22, agi: 10, tec: 18 };
        } else if (this.type === 'villain_3') {
            this.level = 10;
            this.stats = { str: 25, agi: 35, tec: 30 };
        }
        else if (this.type === 'goblin') {
            this.stats = { str: 8, agi: 12, tec: 8 };
        }
        else if (this.type === 'wild_boar') {
            this.stats = { str: 12, agi: 6, tec: 10 };
        }
        else if (this.type === 'treant') {
            this.stats = { str: 15, agi: 5, tec: 15 };
        }
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.hp = this.maxHp;
        this.state = STATE.IDLE;
        this.facing = this.isP1 ? 1 : -1;
        this.alpha = 1.0;
        this.isCrit = false;
        this.vx = 0;
        this.vy = 0;
        this.buffs = { forceCombo: false, forceCrit: false, forceBlock: false, forceDodge: false, atkMultiplier: 1.0, agiMultiplier: 1.0, strBonusMultiplier: 0 }; // 重設 buffs
        this.holdingWeapon = null;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += GRAVITY;

        if (this.y > GROUND_Y) {
            this.y = GROUND_Y;
            this.vy = 0;
        }

        if (this.state === STATE.IDLE || this.state === STATE.HIT || this.state === STATE.DODGE || this.state === STATE.DEAD || this.state === STATE.WIN) {
            this.vx *= 0.8;
        }

        this.animFrame++;

        if (this.state === STATE.DODGE) {
            this.alpha = 0.5;
        } else {
            this.alpha = 1.0;
        }
    }

    // Load images
    static images = {};
    static processedImages = {};
    static onImagesLoaded = null; // Callback
    static loadingStarted = false;

    static loadImages() {
        if (ChibiFighter.loadingStarted) return;
        ChibiFighter.loadingStarted = true;

        const sources = {
            wolf: 'img/wolf.png',
            girl: 'img/girl.png',
            villain: 'img/villain.png',
            monster: 'img/monster.png'
        };

        let loadedCount = 0;
        const total = Object.keys(sources).length;

        for (const [key, src] of Object.entries(sources)) {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                // Remove background with improved algorithm
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Sample multiple corner pixels to determine background color
                const samples = [
                    [0, 0], // Top-left
                    [canvas.width - 1, 0], // Top-right
                    [0, canvas.height - 1], // Bottom-left
                    [canvas.width - 1, canvas.height - 1] // Bottom-right
                ];

                let bgR = 0, bgG = 0, bgB = 0;
                samples.forEach(([x, y]) => {
                    const idx = (y * canvas.width + x) * 4;
                    bgR += data[idx];
                    bgG += data[idx + 1];
                    bgB += data[idx + 2];
                });
                bgR = Math.floor(bgR / samples.length);
                bgG = Math.floor(bgG / samples.length);
                bgB = Math.floor(bgB / samples.length);

                // Use more aggressive threshold for cleaner removal
                const threshold = 50; // Increased from 30

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Check difference from background color
                    const diffR = Math.abs(r - bgR);
                    const diffG = Math.abs(g - bgG);
                    const diffB = Math.abs(b - bgB);

                    if (diffR < threshold && diffG < threshold && diffB < threshold) {
                        data[i + 3] = 0; // Fully transparent
                    } else if (diffR < threshold * 1.5 && diffG < threshold * 1.5 && diffB < threshold * 1.5) {
                        // Semi-transparent for edge smoothing
                        const maxDiff = Math.max(diffR, diffG, diffB);
                        data[i + 3] = Math.floor((maxDiff / (threshold * 1.5)) * 255);
                    }
                }
                ctx.putImageData(imageData, 0, 0);

                const processedImg = new Image();
                processedImg.src = canvas.toDataURL();
                ChibiFighter.processedImages[key] = processedImg;

                // Also update the raw image ref just in case, but we prefer processed
                ChibiFighter.images[key] = processedImg;

                loadedCount++;
                if (loadedCount === total && ChibiFighter.onImagesLoaded) {
                    ChibiFighter.onImagesLoaded();
                }
            };
            img.src = src;
        }
    }

    draw(ctx) {
        ChibiFighter.loadImages(); // Ensure loaded

        ctx.save();
        ctx.globalAlpha = this.alpha;

        // Shadow
        if (this.state !== STATE.DODGE && this.state !== STATE.DEAD) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(this.x, GROUND_Y + 5, 30, 10, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.translate(this.x, this.y);

        // Flip for facing
        // If character is a monster (goblin), the source image faces RIGHT.
        // When facing is -1 (Enemy), scale(-1, 1) flips it to LEFT.
        // If the user said it was reversed, maybe the previous image faced Left?
        // With v2 facing Right, this standard logic should work. 
        // Note: If visual is still wrong, we can invert `this.facing` here for specific types.
        ctx.scale(this.facing, 1);

        // Bobbing animation
        let bobY = 0;
        if (this.state === STATE.IDLE) bobY = Math.sin(this.animFrame * 0.1) * 2;
        if (this.state === STATE.RUN) bobY = Math.sin(this.animFrame * 0.5) * 5;
        if (this.state === STATE.WIN) bobY = Math.sin(this.animFrame * 0.2) * 5;

        ctx.translate(0, bobY);

        // Boss Aura
        if (this.isBoss) {
            const auraAlpha = 0.4 + Math.sin(this.animFrame * 0.1) * 0.3;
            const auraSize = 45 + Math.sin(this.animFrame * 0.1) * 5;
            drawEllipse(ctx, 0, -55, auraSize, 90, `rgba(211, 47, 47, ${auraAlpha})`);
        }

        // Determine which image to use
        let img = ChibiFighter.images.monster; // Fallback

        if (this.type === 'wolf') img = ChibiFighter.images.wolf;
        else if (this.type === 'girl') img = ChibiFighter.images.girl;
        else if (this.type.startsWith('villain')) img = ChibiFighter.images.villain;
        else if (['goblin', 'wild_boar', 'treant'].includes(this.type)) img = ChibiFighter.images.monster;

        // Draw Image
        if (img && img.complete) {
            // Adjust hit/attack states with simple transforms
            ctx.save();

            if (this.state === STATE.ATTACK) {
                // Lunge forward
                ctx.translate(20, 0);
                ctx.rotate(0.2);
            } else if (this.state === STATE.HIT) {
                // Shake
                ctx.translate(Math.random() * 10 - 5, 0);
                ctx.rotate(-0.2);
                ctx.globalAlpha = 0.7; // Flash
            } else if (this.state === STATE.DEAD) {
                ctx.rotate(Math.PI / 2); // Fall over
                ctx.translate(0, -30);
                ctx.globalAlpha = 0.5;
            } else if (this.state === STATE.BLOCK) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 3;
                ctx.strokeRect(-40, -90, 80, 100); // Shield effect hint
            }

            // Draw the sprite centered
            // Assuming sprites are roughly centered and ~150px-200px tall
            // We draw them relative to (0,0) which is around feet level in previous code (-ish)
            // But usually (0,0) here is feet position.
            const w = 140;
            const h = 140;
            ctx.drawImage(img, -w / 2, -h + 10, w, h);

            ctx.restore();
        } else {
            // Loading state - draw nothing (transparent)
        }

        ctx.restore();
    }
}
