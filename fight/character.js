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

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        if (this.state !== STATE.DODGE && this.state !== STATE.DEAD) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(this.x, GROUND_Y + 5, 25, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.translate(this.x, this.y);
        if (this.state === STATE.DEAD) {
            ctx.rotate(this.facing * Math.PI / 2);
            ctx.translate(0, -20);
        }
        ctx.scale(this.facing, 1);

        let bobY = 0;
        if (this.state === STATE.IDLE) bobY = Math.sin(this.animFrame * 0.1) * 2;
        if (this.state === STATE.RUN) bobY = Math.sin(this.animFrame * 0.5) * 5;
        if (this.state === STATE.WIN) bobY = Math.sin(this.animFrame * 0.2) * 5;

        let colors = { pants: '#37474f', body: '#546e7a', skin: '#ffccbc', hair: '#78909c', detail: '#cfd8dc', acc: '#fff', eye: '#000' };

        if (this.type === 'girl') {
            colors = { pants: '#1565c0', body: '#ff7043', skin: '#ffccbc', hair: '#d84315', detail: '#fff', acc: '#d84315', eye: '#3e2723' };
        } else if (this.type.startsWith('villain')) {
            colors = { pants: '#212121', body: '#000000', skin: '#e0e0e0', hair: '#424242', detail: '#757575', acc: '#212121', eye: '#d50000' };
            if (this.type === 'villain_2') colors.hair = '#3e2723'; 
            if (this.type === 'villain_3') colors.body = '#1a237e'; 
        } else if (this.type === 'goblin') {
            colors = { pants: '#5d4037', body: '#4caf50', skin: '#8bc34a', hair: '#33691e', detail: '#a1887f', acc: '#fbc02d', eye: '#000' };
        } else if (this.type === 'wild_boar') {
            colors = { pants: '#4e342e', body: '#795548', skin: '#a1887f', hair: '#4e342e', detail: '#d7ccc8', acc: '#fff', eye: '#000' };
        } else if (this.type === 'treant') {
            colors = { pants: '#3e2723', body: '#5d4037', skin: '#8d6e63', hair: '#4caf50', detail: '#a1887f', acc: '#cddc39', eye: '#cddc39' };
        }

        // --- BOSS Aura ---
        if (this.isBoss) {
            const auraAlpha = 0.4 + Math.sin(this.animFrame * 0.1) * 0.3;
            const auraSize = 35 + Math.sin(this.animFrame * 0.1) * 5;
            drawEllipse(ctx, 0, -45, auraSize, 80, `rgba(211, 47, 47, ${auraAlpha})`);
            drawEllipse(ctx, 0, -45, auraSize * 0.7, 60, `rgba(255, 205, 210, ${auraAlpha * 0.8})`);
        }

        // Define which models use which base
        const isGirlModel = (this.type === 'girl' || this.type === 'villain_2' || this.type === 'treant');
        const isBoarModel = (this.type === 'wild_boar');
        // Default is Wolf/Goblin model

        if (!isGirlModel) {
            // WOLF
            // Legs
            ctx.fillStyle = colors.pants;
            if (this.state === STATE.RUN || this.state === STATE.WIN) {
                let lOffset = (this.state===STATE.WIN) ? 0 : Math.sin(this.animFrame * 0.5) * 10;
                ctx.fillRect(-15 + lOffset, -20, 12, 20); ctx.fillRect(5 - lOffset, -20, 12, 20);
            } else {
                ctx.fillRect(-15, -20, 12, 20); ctx.fillRect(5, -20, 12, 20);
            }
            
            ctx.translate(0, bobY);

            // Body & Clothes
            const bodyGrad = ctx.createLinearGradient(0, -50, 0, -15);
            bodyGrad.addColorStop(0, colors.body);
            bodyGrad.addColorStop(1, '#2c3e50'); // Darker shade for body
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.moveTo(-18, -50); ctx.lineTo(18, -50);
            ctx.lineTo(15, -15); ctx.lineTo(-15, -15);
            ctx.closePath();
            ctx.fill();

            // Head
            ctx.fillStyle = colors.skin; ctx.beginPath(); ctx.arc(0, -65, 22, 0, Math.PI * 2); ctx.fill();

            // Hair
            ctx.fillStyle = colors.hair; ctx.beginPath(); ctx.arc(0, -68, 24, Math.PI, Math.PI * 2.2); ctx.lineTo(20, -50); ctx.lineTo(-20, -50); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-15, -85); ctx.lineTo(-22, -95); ctx.lineTo(-8, -90); ctx.fill(); 
            ctx.beginPath(); ctx.moveTo(5, -90); ctx.lineTo(15, -95); ctx.lineTo(12, -85); ctx.fill();

            // Goblin specific features
            if (this.type === 'goblin') {
                // Big ears
                ctx.fillStyle = colors.skin;
                ctx.beginPath(); ctx.moveTo(-20, -75); ctx.lineTo(-35, -80); ctx.lineTo(-30, -65); ctx.fill();
                ctx.beginPath(); ctx.moveTo(20, -75); ctx.lineTo(35, -80); ctx.lineTo(30, -65); ctx.fill();
            }

            // Eyes & Mouth
            ctx.fillStyle = colors.eye;
            if (isBoarModel) { // Boar snout
                drawEllipse(ctx, 15, -60, 12, 8, colors.skin);
                drawEllipse(ctx, 22, -62, 3, 2, '#5d4037');
            }
            ctx.beginPath();
            if (this.state === STATE.HIT || this.state === STATE.DEAD) {
                ctx.moveTo(3, -70); ctx.lineTo(9, -64); ctx.moveTo(9, -70); ctx.lineTo(3, -64);
                ctx.moveTo(13, -70); ctx.lineTo(19, -64); ctx.moveTo(19, -70); ctx.lineTo(13, -64);
                ctx.stroke();
                ctx.beginPath(); ctx.arc(11, -56, 4, Math.PI * 0.1, Math.PI * 0.9, true); ctx.stroke();
            } else if (this.state === STATE.BLOCK) {
                 ctx.fillRect(3, -68, 6, 2);
                 ctx.fillRect(13, -68, 6, 2);
            } else if (this.state === STATE.WIN) {
                 ctx.beginPath(); ctx.arc(6, -68, 4, Math.PI, Math.PI * 2); ctx.stroke();
                 ctx.beginPath(); ctx.arc(16, -68, 4, Math.PI, Math.PI * 2); ctx.stroke();
                 ctx.beginPath(); ctx.arc(11, -60, 5, 0, Math.PI); ctx.stroke();
            } else if (this.state === STATE.ATTACK) {
                // Angry eyebrows for attack
                ctx.beginPath(); ctx.moveTo(2, -72); ctx.lineTo(10, -70); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(12, -70); ctx.lineTo(20, -72); ctx.stroke();
                ctx.fillRect(4, -68, 5, 2); // Eyes
                ctx.fillRect(14, -68, 5, 2);
            } else {
                ctx.beginPath();
                ctx.arc(6, -68, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(16, -68, 2.5, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillRect(10.5, -63, 1, 2);
                
                ctx.beginPath();
                ctx.moveTo(8, -58); ctx.lineTo(14, -58);
                ctx.stroke();
            }

            if (this.state === STATE.ATTACK) {
                ctx.save();
                if (this.isCrit) { ctx.shadowBlur = 20; ctx.shadowColor = '#ffd700'; }
                let swing = Math.sin(this.animFrame * 0.2); 
                ctx.translate(5, -55); ctx.rotate(swing - 0.5); 
                
                // Draw Sword if holding
                if (this.holdingWeapon === 'wooden_sword') {
                    ctx.save();
                    ctx.translate(35, 5); // Hand pos
                    ctx.rotate(-1.2); // Angle sword up
                    ctx.fillStyle = '#8d6e63'; // Wood color
                    ctx.fillRect(0, -3, 50, 6); // Blade
                    ctx.fillStyle = '#5d4037'; // Hilt
                    ctx.fillRect(-10, -3, 10, 6); 
                    ctx.fillRect(0, -8, 4, 16); // Crossguard
                    ctx.restore();
                }
                // Draw Dagger
                if (this.holdingWeapon === 'dagger') {
                    ctx.save();
                    ctx.translate(35, 5);
                    ctx.rotate(1.8); // Reverse grip
                    ctx.fillStyle = '#b0bec5'; // Silver blade
                    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(25, -5); ctx.lineTo(30, 0); ctx.lineTo(25, 5); ctx.fill();
                    ctx.fillStyle = '#37474f'; // Hilt
                    ctx.fillRect(-8, -3, 8, 6);
                    ctx.restore();
                }


                ctx.fillStyle = this.isCrit ? '#fff' : colors.body; 
                ctx.fillRect(0, -5, 30, 12); 
                ctx.fillStyle = colors.skin; ctx.fillRect(30, -5, 12, 12); 
                ctx.fillStyle = this.isCrit ? '#ffff00' : '#eee'; 
                ctx.beginPath(); ctx.moveTo(42, -5); ctx.lineTo(52, 0); ctx.lineTo(42, 5); ctx.fill();
                ctx.restore();
            } else if (this.state === STATE.BLOCK) {
                ctx.save(); ctx.translate(15, -55); ctx.rotate(-1.5); ctx.fillRect(0, 0, 20, 10); ctx.restore();
            } else if (this.state === STATE.WIN) {
                ctx.save(); ctx.translate(-10, -55); ctx.rotate(-2.5); ctx.fillRect(0, 0, 25, 10); ctx.restore();
                ctx.save(); ctx.translate(10, -55); ctx.rotate(-0.5); ctx.fillRect(0, 0, 25, 10); ctx.restore();
            } else if (this.state === STATE.SPECIAL) {
                // Special Skill Pose (Power up)
                const shake = Math.sin(this.animFrame * 0.8) * 2;
                ctx.translate(shake, 0);
                ctx.shadowBlur = 30; 
                ctx.shadowColor = '#ffcc00'; 
                
                ctx.fillStyle = colors.body;
                // Left arm up
                ctx.save(); ctx.translate(-12, -55); ctx.rotate(-2.5); ctx.fillRect(0, 0, 25, 10); ctx.restore();
                // Right arm up
                ctx.save(); ctx.translate(12, -55); ctx.rotate(-0.6); ctx.fillRect(0, 0, 25, 10); ctx.restore();
                
                // Head up
                // Shouting mouth
                ctx.fillStyle = colors.eye;
                ctx.beginPath();
                ctx.arc(11, -58, 5, 0, Math.PI * 2); ctx.fill();
            } else if (this.state === STATE.DEAD) {
                ctx.fillRect(-10, -50, 10, 25);
            } else {
                ctx.fillRect(-5, -50, 10, 25);
            }

        } else {
            // == GIRL ==
            ctx.fillStyle = colors.pants;
            if (this.state === STATE.RUN || this.state === STATE.WIN) {
                let lOffset = (this.state===STATE.WIN) ? 0 : Math.sin(this.animFrame * 0.5) * 10;
                ctx.fillRect(-15 + lOffset, -20, 12, 20); ctx.fillRect(5 - lOffset, -20, 12, 20);
            } else {
                ctx.fillRect(-15, -20, 12, 20); ctx.fillRect(5, -20, 12, 20);
            }

            ctx.translate(0, bobY);

            // Body & Clothes (Girl)
            const girlBodyGrad = ctx.createLinearGradient(0, -50, 0, -15);
            girlBodyGrad.addColorStop(0, colors.body);
            girlBodyGrad.addColorStop(1, '#c0392b'); // Darker red
            ctx.fillStyle = girlBodyGrad;
            ctx.beginPath();
            ctx.moveTo(-15, -50); ctx.lineTo(15, -50);
            ctx.lineTo(12, -15); ctx.lineTo(-12, -15);
            ctx.closePath();
            ctx.fill();

            // Head
            ctx.fillStyle = colors.skin; ctx.beginPath(); ctx.arc(0, -65, 20, 0, Math.PI * 2); ctx.fill();

            // Hair (Girl)
            ctx.fillStyle = colors.hair; ctx.beginPath(); ctx.arc(0, -68, 22, Math.PI * 0.8, Math.PI * 2.2); ctx.fill();
            if (this.type === 'treant') { // Leaves for hair
                drawEllipse(ctx, -15, -85, 15, 10, '#689f38');
                drawEllipse(ctx, 0, -90, 15, 12, '#7cb342');
                drawEllipse(ctx, 15, -85, 15, 10, '#8bc34a');
            } else {
                drawEllipse(ctx, -18, -75, 10, 10, colors.hair);
            }
            drawEllipse(ctx, 10, -78, 8, 8, colors.hair);
            ctx.fillStyle = colors.detail; ctx.fillRect(12, -75, 4, 10);

            // Eyes & Mouth (Girl)
            ctx.fillStyle = colors.eye;
            if (this.state === STATE.HIT || this.state === STATE.DEAD) {
                ctx.beginPath();
                ctx.moveTo(2, -69); ctx.lineTo(8, -65); ctx.lineTo(2, -61);
                ctx.moveTo(18, -69); ctx.lineTo(12, -65); ctx.lineTo(18, -61);
                ctx.stroke();
                ctx.beginPath(); ctx.arc(10, -55, 4, Math.PI * 0.1, Math.PI * 0.9, true); ctx.stroke();
            } else if (this.state === STATE.BLOCK) {
                 ctx.fillRect(4, -67, 5, 2);
                 ctx.fillRect(12, -67, 5, 2);
            } else if (this.state === STATE.WIN) {
                 ctx.beginPath(); ctx.arc(6, -65, 3, Math.PI, Math.PI * 2); ctx.stroke();
                 ctx.beginPath(); ctx.arc(14, -65, 3, Math.PI, Math.PI * 2); ctx.stroke();
                 ctx.beginPath(); ctx.arc(10, -58, 4, 0, Math.PI); ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(6, -66, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(14, -66, 2.5, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillRect(9.5, -62, 1, 2);
                ctx.beginPath(); ctx.arc(10, -57, 2.5, 0, Math.PI); ctx.stroke();
            }

            ctx.fillStyle = colors.skin; 
            if (this.state === STATE.ATTACK) {
                ctx.save();
                if (this.isCrit) { ctx.shadowBlur = 20; ctx.shadowColor = '#ff5252'; }
                let swing = Math.sin(this.animFrame * 0.2); 
                ctx.translate(10, -55); ctx.rotate(swing - 0.5); 
                ctx.fillStyle = colors.skin; ctx.fillRect(0, 0, 20, 8); 
                
                // Draw Sword if holding
                if (this.holdingWeapon === 'wooden_sword') {
                    ctx.save();
                    ctx.translate(10, 4); // Hand pos
                    ctx.rotate(-1.2);
                    ctx.fillStyle = '#8d6e63';
                    ctx.fillRect(0, -2, 50, 4);
                    ctx.fillStyle = '#5d4037';
                    ctx.fillRect(-10, -2, 10, 4);
                    ctx.fillRect(0, -6, 4, 12);
                    ctx.restore();
                }
                // Draw Dagger
                if (this.holdingWeapon === 'dagger') {
                    ctx.save();
                    ctx.translate(10, 4);
                    ctx.rotate(1.8); // Reverse grip
                    ctx.fillStyle = '#b0bec5'; // Silver blade
                    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(25, -5); ctx.lineTo(30, 0); ctx.lineTo(25, 5); ctx.fill();
                    ctx.fillStyle = '#37474f'; // Hilt
                    ctx.fillRect(-8, -3, 8, 6);
                    ctx.restore();
                }

                ctx.translate(20, 0); ctx.rotate(1.2); 
                ctx.fillStyle = '#8d6e63'; ctx.fillRect(-2, -20, 4, 50); 
                ctx.fillStyle = this.isCrit ? '#ffecb3' : '#757575'; ctx.fillRect(-12, -30, 24, 18);
                ctx.strokeStyle = this.isCrit ? '#ff6f00' : '#bdbdbd'; ctx.lineWidth = 2; ctx.strokeRect(-12, -30, 24, 18);
                ctx.restore();
            } else if (this.state === STATE.BLOCK) {
                ctx.save(); ctx.translate(15, -55); ctx.rotate(-1.5); ctx.fillRect(0, 0, 20, 8); ctx.restore();
            } else if (this.state === STATE.WIN) {
                ctx.save(); ctx.translate(15, -65); ctx.rotate(-2.0); ctx.fillStyle = colors.skin; ctx.fillRect(0, 0, 20, 8);
                ctx.rotate(1.5); ctx.fillStyle = '#8d6e63'; ctx.fillRect(20, -20, 4, 50); 
                ctx.fillStyle = '#757575'; ctx.fillRect(-12, -30, 24, 18); ctx.restore();
            } else if (this.state === STATE.SPECIAL) {
                // Special Skill Pose for Girl
                const shake = Math.sin(this.animFrame * 1.2) * 3;
                ctx.translate(shake, 0);
                ctx.shadowBlur = 40; ctx.shadowColor = '#ff5252';
                ctx.fillStyle = colors.skin; 
                // 雙手向下蓄力
                ctx.save(); ctx.translate(-10, -45); ctx.rotate(0.8); ctx.fillRect(-15, 0, 20, 8); ctx.restore(); // Right arm
                ctx.save(); ctx.translate(10, -45); ctx.rotate(-0.8); ctx.fillRect(0, 0, 20, 8); ctx.restore(); // Left Arm
                
                // 力量特效
                drawEllipse(ctx, 0, 5, 30 + shake, 10, 'rgba(255, 82, 82, 0.3)');
                drawEllipse(ctx, 0, 5, 20 + shake, 6, 'rgba(255, 204, 188, 0.5)');
            } else if (this.state === STATE.DEAD) {
                ctx.fillRect(10, -50, 8, 20);
            } else {
                ctx.fillRect(10, -50, 8, 20);
            }
        }

        ctx.restore();
    }
}
