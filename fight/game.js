const PHASE = { DECIDE: 0, APPROACH: 1, ACT: 2, IMPACT: 3, RETREAT: 4, WAIT: 5 };

// Loot table for enemy drops
const DROPPABLE_ITEMS = [
    'water', 'banana', 'apple', 'health_potion', 'shield', 'smokebomb',
    'wooden_sword', 'dagger', 'spiked_club'
];

function spawnDamageText(x, y, text, type) {
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 30;

    const el = document.createElement('div');
    el.className = 'dmg-popup';
    if (type === 'crit') el.classList.add('dmg-crit');
    if (type === 'miss') el.classList.add('dmg-miss');
    if (type === 'block') el.classList.add('dmg-block');
    if (type === 'combo') el.classList.add('dmg-combo');
    if (type === 'heal') el.classList.add('dmg-heal');
    el.innerText = text;
    el.style.left = (x + offsetX) + 'px';
    el.style.top = (y - 70 + offsetY) + 'px';
    document.getElementById('damage-container').appendChild(el);
    setTimeout(() => el.remove(), 800);
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.container = document.getElementById('game-container');

        this.lobbyView = document.getElementById('lobby-view');
        this.battleView = document.getElementById('battle-view');
        this.mode = 'LOBBY';

        const DEFAULT_HERO_DATA = [
            { type: 'wolf', name: 'Wolf Boy', level: 5, exp: 0, stats: { str: 18, agi: 25, tec: 15 }, baseStats: { str: 18, agi: 25, tec: 15 }, points: 20, ownedSkills: ['crazy_slash'], equippedSkills: [], ownedItems: ['dagger', 'apple'], defeatedBosses: [] },
            { type: 'girl', name: 'Red Girl', level: 5, exp: 0, stats: { str: 28, agi: 12, tec: 10 }, baseStats: { str: 28, agi: 12, tec: 10 }, points: 20, ownedSkills: ['giants_strength'], equippedSkills: [], ownedItems: ['spiked_club', 'apple'], defeatedBosses: [] }
        ];

        this.heroData = JSON.parse(JSON.stringify(DEFAULT_HERO_DATA));
        this.itemInstanceCounter = 0; // For unique item IDs
        this.loadGame();

        this.testMode = false;
        this.currentHeroIndex = 0;
        this.selectedEnemyType = null;
        this.selectedEnemyName = '';
        this.selectedItemForModal = null;

        this.pendingSkill = null;

        this.villainData = [];
        this.generateVillains(this.heroData[this.currentHeroIndex].level);

        this.renderPortrait(new ChibiFighter(0, 0, true, '', 'wolf'), 'lobby-hero-portrait');
        this.renderPortrait(new ChibiFighter(0, 0, true, '', 'villain_1'), 'v-1');
        this.renderPortrait(new ChibiFighter(0, 0, false, '', 'villain_2'), 'v-2');
        this.renderPortrait(new ChibiFighter(0, 0, false, '', 'villain_3'), 'v-3');

        this.updateLobbyDisplay();

        this.particles = [];
        for (let i = 0; i < 15; i++) this.particles.push(new Particle(Math.random() * 800, Math.random() * 600, 'leaf'));

        this.forestTrees = [];
        this.generateForestTrees();

        this.activePlayer = null;
        this.targetPlayer = null;
        this.matchOver = true;

        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);

        // Refresh UI when images load
        ChibiFighter.onImagesLoaded = () => {
            console.log("Images loaded and processed.");
            this.updateLobbyDisplay();
            // Force re-render of static portraits
            this.renderPortrait(new ChibiFighter(0, 0, true, '', 'wolf'), 'lobby-hero-portrait');
            this.renderPortrait(new ChibiFighter(0, 0, true, '', 'villain_1'), 'v-1');
            this.renderPortrait(new ChibiFighter(0, 0, false, '', 'villain_2'), 'v-2');
            this.renderPortrait(new ChibiFighter(0, 0, false, '', 'villain_3'), 'v-3');
        };
    }

    saveGame() { try { localStorage.setItem('fighter_legend_data', JSON.stringify(this.heroData)); } catch (e) { } }

    loadGame() {
        try {
            const data = localStorage.getItem('fighter_legend_data');
            if (data) {
                const parsed = JSON.parse(data);
                // MIGRATION LOGIC:
                parsed.forEach(hero => {
                    if (!hero.ownedSkills) hero.ownedSkills = (hero.type === 'wolf') ? ['crazy_slash', 'critical_strike'] : [];

                    // --- Migration for ownedItems to object structure ---
                    if (!hero.ownedItems || (hero.ownedItems.length > 0 && typeof hero.ownedItems[0] === 'string')) {
                        const oldItems = hero.ownedItems || ((hero.type === 'wolf') ? ['wooden_sword', 'dagger'] : []);
                        hero.ownedItems = oldItems.map(id => ({
                            id: id,
                            instanceId: Date.now() + this.itemInstanceCounter++
                        }));
                        // Since item structure changed, old equipped indices are invalid.
                        hero.equippedSkills = hero.equippedSkills.filter(s => typeof s === 'string');
                    }

                    if (!hero.equippedSkills) hero.equippedSkills = []; // Ensure it exists

                    // Migration for 'spiked_club' item for the girl
                    if (hero.type === 'girl' && !hero.ownedItems.some(item => item.id === 'spiked_club')) {
                        hero.ownedItems.push({ id: 'spiked_club', instanceId: Date.now() + this.itemInstanceCounter++ });
                    }
                    // Migration for 'apple' item for wolf
                    if (hero.type === 'wolf' && !hero.ownedItems.some(item => item.id === 'apple')) {
                        hero.ownedItems.push({ id: 'apple', instanceId: Date.now() + this.itemInstanceCounter++ });
                    }
                    // Migration for 'apple' item for the girl
                    if (hero.type === 'girl' && !hero.ownedItems.includes('apple')) {
                        hero.ownedItems.push('apple');
                    }
                    if (!hero.defeatedBosses) hero.defeatedBosses = []; // Migration for level cap
                });
                this.heroData = parsed;
            } else {
                // If no save data, initialize maxExp for default heroes
                this.heroData.forEach(hero => {
                    hero.maxExp = Math.floor(100 * Math.pow(1.25, hero.level - 1));
                });
            }
        } catch (e) {
            console.error("Load failed", e);
        }
    }

    resetGame() { document.getElementById('reset-confirm-modal').classList.add('show'); }
    closeResetModal() { document.getElementById('reset-confirm-modal').classList.remove('show'); }
    confirmReset() {
        localStorage.removeItem('fighter_legend_data');
        // Manual Reset
        const DEFAULT_HERO_DATA = [
            { type: 'wolf', name: 'Wolf Boy', level: 5, exp: 0, stats: { str: 18, agi: 25, tec: 15 }, baseStats: { str: 18, agi: 25, tec: 15 }, points: 20, ownedSkills: ['crazy_slash'], equippedSkills: [], ownedItems: ['dagger', 'apple'], defeatedBosses: [] },
            { type: 'girl', name: 'Red Girl', level: 5, exp: 0, stats: { str: 28, agi: 12, tec: 10 }, baseStats: { str: 28, agi: 12, tec: 10 }, points: 20, ownedSkills: ['giants_strength'], equippedSkills: [], ownedItems: ['spiked_club', 'apple'], defeatedBosses: [] }
        ].map(hero => ({
            ...hero,
            ownedItems: hero.ownedItems.map(id => ({
                id: id,
                instanceId: Date.now() + this.itemInstanceCounter++
            }))
        }));
        this.heroData = JSON.parse(JSON.stringify(DEFAULT_HERO_DATA));
        this.heroData.forEach(hero => {
            hero.maxExp = Math.floor(100 * Math.pow(1.25, hero.level - 1));
        });
        this.closeResetModal();
        this.returnToLobby();
    }

    toggleTestMode() {
        this.testMode = !this.testMode;
        const btn = document.getElementById('test-mode-btn');
        if (this.testMode) {
            btn.classList.add('active');
            document.getElementById('level-controls').style.display = 'inline-block';
        } else {
            btn.classList.remove('active');
            document.getElementById('level-controls').style.display = 'none';
        }
        this.updateLobbyDisplay();
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
        document.getElementById(`tab-btn-${tabName}`).classList.add('active');
        document.getElementById(`tab-content-${tabName}`).style.display = 'grid';
    }

    openItemInfo(itemOrSkill, type) {
        this.selectedItemForModal = { item: itemOrSkill, type };
        const id = (type === 'skill') ? itemOrSkill : itemOrSkill.id;
        const dbItem = ASSETS_DB[id];
        if (!dbItem) return;

        document.getElementById('item-title').innerText = dbItem.name;
        document.getElementById('item-desc').innerText = dbItem.desc;

        const hero = this.heroData[this.currentHeroIndex];
        let isEquipped = false;
        if (type === 'item') {
            isEquipped = hero.equippedSkills.includes(itemOrSkill.instanceId);
        } else { // For skills, it's still a string id
            isEquipped = hero.equippedSkills.includes(id);
        }

        const btn = document.getElementById('item-equip-btn');

        if (isEquipped) {
            btn.innerText = "卸下";
            btn.style.background = '#555';
        } else {
            btn.innerText = "攜帶";
            btn.style.background = '#d32f2f';
        }

        document.getElementById('item-info-modal').classList.add('show');
    }

    closeItemInfo() {
        document.getElementById('item-info-modal').classList.remove('show');
        this.selectedItemForModal = null;
    }

    equipCurrentItem() {
        if (!this.selectedItemForModal) return;
        const { item, type } = this.selectedItemForModal;
        const id = (type === 'skill') ? item : item.id;
        const instanceId = (type === 'item') ? item.instanceId : null;

        const hero = this.heroData[this.currentHeroIndex];

        const equippedId = (type === 'item') ? instanceId : id;
        const equippedIndex = hero.equippedSkills.indexOf(equippedId);
        const isEquipped = equippedIndex > -1;

        if (isEquipped) {
            // Unequip
            hero.equippedSkills.splice(equippedIndex, 1);
        } else {
            // Equip
            if (hero.equippedSkills.length < 8) {
                if (type === 'item') {
                    hero.equippedSkills.push(instanceId);
                } else {
                    hero.equippedSkills.push(id);
                }
            } else {
                alert("攜帶欄位已滿！");
            }
        }

        this.saveGame();
        this.updateLobbyDisplay();
        this.closeItemInfo();
    }

    adjustLevel(delta) {
        const hero = this.heroData[this.currentHeroIndex];
        if (delta > 0) {
            hero.level++;
            hero.points += 5;
            if (!this.testMode) {
                ['str', 'agi', 'tec'].forEach(s => { hero.baseStats[s]++; hero.stats[s]++; });
            }
        } else {
            const minLevel = this.testMode ? 5 : 1;
            if (hero.level > minLevel) {
                hero.level--;
                if (!this.testMode) {
                    ['str', 'agi', 'tec'].forEach(s => { hero.baseStats[s]--; hero.stats[s]--; });
                }

                // 回收所有已分配點數，並將能力值重置為基礎值
                hero.stats.str = hero.baseStats.str;
                hero.stats.agi = hero.baseStats.agi;
                hero.stats.tec = hero.baseStats.tec;
                hero.points = (hero.level - 4) * 5;
            }
        }
        hero.maxExp = Math.floor(100 * Math.pow(1.25, hero.level - 1));
        this.saveGame();
        this.updateLobbyDisplay();
    }

    generateVillains(heroLevel) {
        this.villainData = [];

        if (heroLevel >= 5 && heroLevel < 11) {
            // Forest Themed Enemies for levels 5-9
            const types = ['goblin', 'wild_boar', 'treant'];
            const names = ['森林哥布林', '狂暴野豬', '枯木樹精'];
            for (let i = 0; i < 3; i++) {
                // The third villain is a fixed Lv.10 Boss
                const isBoss = (i === 2);
                const level = isBoss ? 10 : Math.floor(Math.random() * 5) + 5; // Random level between 5-9 for minions
                this.addVillain(i, types[i], names[i], level, isBoss);
            }
        } else if (heroLevel >= 11) {
            // Ninja Themed Enemies for levels 10+
            const types = ['villain_1', 'villain_2', 'villain_3'];
            const names = ['黑衣影衛', '黑衣狂徒', '暗黑忍者'];
            // The third villain is a Boss
            for (let i = 0; i < 3; i++) {
                const isBoss = (i === 2);
                const level = isBoss ? 15 : Math.floor(Math.random() * 5) + 10; // Lv.10-14 for minions, Lv.15 for Boss
                this.addVillain(i, types[i], names[i], level, isBoss);
            }
        } else {
            // Default logic for levels 1-4
            const types = ['goblin', 'wild_boar', 'goblin'];
            const names = ['哥布林', '小野豬', '哥布林斥侯'];
            for (let i = 0; i < 3; i++) {
                let level = Math.max(1, heroLevel + Math.floor(Math.random() * 2));
                this.addVillain(i, types[i], names[i], level, false);
            }
        }
    }

    addVillain(id, type, name, level, isBoss) {
        let str = 10, agi = 10, tec = 10;
        if (type === 'villain_1') { str = 10 + level * 1.5; agi = 10 + level * 1.5; tec = 10 + level * 1.5; }
        else if (type === 'villain_2') { str = 15 + level * 2; agi = 8 + level * 1; tec = 10 + level * 1.2; }
        else if (type === 'villain_3') { str = 10 + level * 1.5; agi = 15 + level * 2; tec = 15 + level * 2; }
        // New enemy stats
        else if (type === 'goblin') { str = 8 + level * 1.2; agi = 12 + level * 1.8; tec = 8 + level * 1.0; }
        else if (type === 'wild_boar') { str = 12 + level * 2.2; agi = 6 + level * 0.8; tec = 10 + level * 1.1; }
        else if (type === 'treant') { str = 15 + level * 1.5; agi = 5 + level * 0.5; tec = 15 + level * 1.5; }
        this.villainData.push({ id, type, name, level, isBoss, stats: { str: Math.floor(str), agi: Math.floor(agi), tec: Math.floor(tec) } });
    }

    generateForestTrees() {
        this.forestTrees = [];
        for (let i = 0; i < 5; i++) {
            const x = i * 200 + Math.random() * 100 - 50;
            const h = 200 + Math.random() * 100;
            this.forestTrees.push({ x, h });
        }
    }

    handleResize() {
        const scale = Math.min(window.innerWidth / 800, window.innerHeight / 600);
        this.container.style.transform = `scale(${scale})`;
    }

    nextHero() {
        this.currentHeroIndex = (this.currentHeroIndex + 1) % this.heroData.length;
        this.generateVillains(this.heroData[this.currentHeroIndex].level);
        this.updateLobbyDisplay();
    }

    prevHero() {
        this.currentHeroIndex = (this.currentHeroIndex - 1 + this.heroData.length) % this.heroData.length;
        this.generateVillains(this.heroData[this.currentHeroIndex].level);
        this.updateLobbyDisplay();
    }

    adjustStat(statName, delta) {
        const hero = this.heroData[this.currentHeroIndex];
        if (delta > 0) {
            if (hero.points > 0) {
                hero.stats[statName]++;
                hero.points--;
            }
        } else {
            if (hero.stats[statName] > hero.baseStats[statName]) {
                hero.stats[statName]--;
                hero.points++;
            }
        }
        this.saveGame();
        this.updateLobbyDisplay();
    }

    showStatInfo(stat) {
        const hero = this.heroData[this.currentHeroIndex];
        const base = hero.baseStats[stat];
        const current = hero.stats[stat];
        const diff = current - base;
        const sign = diff >= 0 ? "+" : "-";
        const absDiff = Math.abs(diff);
        const modal = document.getElementById('stat-info-modal');
        const title = document.getElementById('info-title');
        const calc = document.getElementById('info-calc');
        const desc = document.getElementById('info-desc');
        let name = "";
        let descText = "";
        if (stat === 'str') { name = "強壯 STR"; descText = "增加物理傷害與生命值。"; }
        else if (stat === 'agi') { name = "敏捷 AGI"; descText = "增加暴擊機率 (CRIT) 與閃避機率 (MISS)，並增加些許攻擊力。"; }
        else if (stat === 'tec') { name = "技巧 TEC"; descText = "增加連擊機率 (COMBO) 與格擋機率 (BLOCK)，並增加些許攻擊力。"; }
        title.innerText = name;
        calc.innerText = `${current}  =  ${base}  ${sign}  ${absDiff}`;
        desc.innerText = descText;
        modal.classList.add('show');
    }

    closeStatInfo() { document.getElementById('stat-info-modal').classList.remove('show'); }

    showDetailStats() {
        const hero = this.heroData[this.currentHeroIndex];
        const s = hero.stats;
        const wAtk = 100; const wCombo = s.tec * 2; const wCrit = s.agi * 2; const total = wAtk + wCombo + wCrit;
        const dmg = Math.floor((s.str * 0.5) + (s.agi * 0.25) + (s.tec * 0.25));
        const crit = ((wCrit / total) * 100).toFixed(1);
        const combo = ((wCombo / total) * 100).toFixed(1);
        const dodge = (s.agi / (s.agi + 200) * 100).toFixed(1);
        const block = (s.tec / (s.tec + 200) * 100).toFixed(1);
        document.getElementById('d-atk').innerText = dmg;
        document.getElementById('d-crit').innerText = crit + '%';
        document.getElementById('d-dodge').innerText = dodge + '%';
        document.getElementById('d-block').innerText = block + '%';
        document.getElementById('d-combo').innerText = combo + '%';
        document.getElementById('detail-stats-modal').classList.add('show');
    }

    closeDetailStats() { document.getElementById('detail-stats-modal').classList.remove('show'); }

    updateLobbyDisplay() {
        const hero = this.heroData[this.currentHeroIndex];
        document.getElementById('lobby-hero-name').innerText = hero.name;
        document.getElementById('lobby-hero-lvl').innerText = hero.level;
        document.getElementById('lobby-hero-exp').innerText = `${hero.exp}/${hero.maxExp}`;
        document.getElementById('stat-points').innerText = `剩餘點數: ${hero.points}`;

        const maxHp = 100 + (hero.stats.str * 5) + (hero.level * 20);
        document.getElementById('lobby-hero-hp').innerText = maxHp;

        this.updateStatUI('val-str', hero.baseStats.str, hero.stats.str);
        this.updateStatUI('val-agi', hero.baseStats.agi, hero.stats.agi);
        this.updateStatUI('val-tec', hero.baseStats.tec, hero.stats.tec);

        ['str', 'agi', 'tec'].forEach(stat => {
            let canInc = false;
            let canDec = false;
            if (this.testMode) {
                canInc = true; canDec = hero.stats[stat] > 1;
            } else {
                canInc = hero.points > 0; canDec = hero.stats[stat] > hero.baseStats[stat];
            }
            document.getElementById(`btn-inc-${stat}`).disabled = !canInc;
            document.getElementById(`btn-dec-${stat}`).disabled = !canDec;
        });

        this.renderPortrait(new ChibiFighter(0, 0, true, '', hero.type), 'lobby-hero-portrait');

        const skillContainer = document.getElementById('tab-content-skills');
        skillContainer.innerHTML = '';
        hero.ownedSkills.forEach(sid => {
            const skill = ASSETS_DB[sid];
            // A skill is equipped if its ID is in the array
            const isEquipped = hero.equippedSkills.some(slot => {
                if (typeof slot === 'string') return slot === sid;
                return false; // It's an item object
            });

            const el = document.createElement('div');
            el.className = 'item-slot' + (isEquipped ? ' equipped' : '');
            el.innerText = skill ? skill.displayName : (sid || '未知');
            el.onclick = () => this.openItemInfo(sid, 'skill');
            skillContainer.appendChild(el);
        });
        const totalSlots = 10;
        for (let i = hero.ownedSkills.length; i < totalSlots; i++) {
            const el = document.createElement('div');
            el.className = 'item-slot locked';
            el.innerText = '鎖';
            skillContainer.appendChild(el);
        }
        // Render Items Tab
        const itemContainer = document.getElementById('tab-content-items');
        itemContainer.innerHTML = '';

        hero.ownedItems.forEach((itemInstance) => {
            const itemId = itemInstance.id || itemInstance;
            const item = ASSETS_DB[itemId];
            // An item is equipped if an object with its index exists in equippedSkills
            const isEquipped = hero.equippedSkills.includes(itemInstance.instanceId);

            const el = document.createElement('div');
            el.className = 'item-slot' + (isEquipped ? ' equipped' : '');
            el.innerText = item ? item.displayName : (itemId || '未知');
            el.onclick = () => this.openItemInfo(itemInstance, 'item');
            itemContainer.appendChild(el);
        });
        for (let i = hero.ownedItems.length; i < 12; i++) {
            const el = document.createElement('div');
            el.className = 'item-slot';
            itemContainer.appendChild(el);
        }

        const villainContainer = document.getElementById('villain-list');
        villainContainer.innerHTML = '';
        this.villainData.forEach((v, index) => {
            const div = document.createElement('div');
            div.className = v.isBoss ? 'villain-row boss' : 'villain-row';
            const bossLabel = v.isBoss ? '<span class="boss-tag">BOSS</span>' : '';
            div.innerHTML = `
                <div class="villain-info">
                    <div class="mini-portrait" id="v-p-${index}"></div>
                    <div>
                        <div class="villain-name"><span class="lvl-badge">LV.${v.level}</span>${v.name}${bossLabel}</div>
                        <div class="villain-stats-mini">強壯:${v.stats.str} 敏捷:${v.stats.agi} 技巧:${v.stats.tec}</div>
                    </div>
                </div>
                <button class="attack-btn" onclick="game.startBattleWith(${index})">攻擊</button>
            `;
            villainContainer.appendChild(div);
            this.renderPortrait(new ChibiFighter(0, 0, false, '', v.type), `v-p-${index}`);
        });
    }

    updateStatUI(id, base, current) {
        const el = document.getElementById(id);
        el.innerText = current;
        el.style.color = '#ffeb3b';
    }

    renderPortrait(char, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        const pCanvas = document.createElement('canvas');
        pCanvas.width = 100;
        pCanvas.height = 100;
        const pCtx = pCanvas.getContext('2d');

        pCtx.fillStyle = '#81c784';
        pCtx.fillRect(0, 0, 100, 100);
        pCtx.save();
        pCtx.translate(50, 130);
        pCtx.scale(1.3, 1.3);

        const oldX = char.x;
        const oldY = char.y;
        const oldFacing = char.facing;

        char.x = 0; char.y = 0; char.facing = 1;
        if (char.type.startsWith('villain')) char.facing = -1;

        char.draw(pCtx);

        char.x = oldX; char.y = oldY; char.facing = oldFacing;
        pCtx.restore();
        container.appendChild(pCanvas);
    }

    startBattleWith(villainIndex) {
        this.selectedEnemyIndex = villainIndex;
        const villain = this.villainData[villainIndex];
        this.mode = 'BATTLE';
        this.lobbyView.style.display = 'none';
        this.battleView.style.display = 'block';
        this.startMatch();
    }

    returnToLobby() {
        this.mode = 'LOBBY';
        this.battleView.style.display = 'none';
        this.lobbyView.style.display = 'flex';
        this.matchOver = true;
        this.showModal(null);
        this.generateVillains(this.heroData[this.currentHeroIndex].level);
        this.updateLobbyDisplay();
        this.saveGame();
    }

    startMatch() {
        const heroData = this.heroData[this.currentHeroIndex];
        const villain = this.villainData[this.selectedEnemyIndex];

        this.p1 = new ChibiFighter(150, GROUND_Y, true, heroData.name, heroData.type, heroData);
        this.p2 = new ChibiFighter(650, GROUND_Y, false, villain.name, villain.type, villain);
        this.p2.isBoss = villain.isBoss; // Pass boss status to character

        this.renderPortrait(this.p1, 'p1-portrait');
        this.renderPortrait(this.p2, 'p2-portrait');
        document.getElementById('p1-name').innerText = `LV.${this.p1.level} ${heroData.name}`;
        document.getElementById('p2-name').innerText = `LV.${this.p2.level} ${villain.name}`;

        const battleSlots = document.getElementById('battle-slots');
        battleSlots.innerHTML = '';
        this.pendingSkill = null;

        for (let i = 0; i < 8; i++) {
            const slotData = heroData.equippedSkills[i];
            const el = document.createElement('div');
            el.className = 'battle-slot';
            if (slotData) {
                let sid;
                if (typeof slotData === 'string') {
                    sid = slotData; // It's a skill ID
                } else { // It's an item instanceId (number)
                    const itemInstance = heroData.ownedItems.find(item => item.instanceId === slotData);
                    if (itemInstance) {
                        sid = itemInstance.id;
                    }
                }
                const asset = sid ? ASSETS_DB[sid] : null;
                el.innerText = asset ? asset.displayName : '';
                el.onclick = () => this.clickSkillSlot(sid, el);
            } else {
                el.innerText = "";
            }
            battleSlots.appendChild(el);
        }

        this.matchOver = false;
        this.isPaused = false;
        this.activePlayer = null;
        this.targetPlayer = null;
        this.turnPhase = PHASE.WAIT;
        this.turnTimer = 9999;
        this.comboCount = 0;

        this.updateHealthUI();
        setTimeout(() => {
            if (this.mode === 'BATTLE') {
                this.startTurn(this.p1);
            }
        }, 500);
    }

    clickSkillSlot(sid, el) {
        if (this.matchOver || el.classList.contains('used')) return;

        if (el.classList.contains('selected')) {
            el.classList.remove('selected');
            this.pendingSkill = null;
        } else {
            document.querySelectorAll('.battle-slot').forEach(s => s.classList.remove('selected'));
            el.classList.add('selected');
            this.pendingSkill = { id: sid, element: el };
        }
    }

    startTurn(player) {
        if (this.matchOver || this.mode !== 'BATTLE') return;
        if (!player) return;

        this.activePlayer = player;
        this.targetPlayer = (player === this.p1) ? this.p2 : this.p1;
        this.turnPhase = PHASE.DECIDE;
        this.turnTimer = 30;
        this.comboCount = 0;

        this.activePlayer.isCrit = false;
        this.targetPlayer.state = STATE.IDLE;

        if (this.activePlayer === this.p1) {
            // Keep pending skill selection
        }
    }

    gainExp(amount, droppedItems = []) {
        const hero = this.heroData[this.currentHeroIndex];
        hero.exp += amount;

        let newSkillsLearned = [];
        let leveledUp = false;
        let levelCapped = false;
        while (hero.exp >= hero.maxExp) {
            // --- Level Cap Check ---
            if (hero.level === 10 && !hero.defeatedBosses.includes('treant_10')) {
                hero.exp = hero.maxExp - 1;
                levelCapped = true;
                break; // Stop the level up process
            }

            hero.exp -= hero.maxExp;
            hero.level++;
            hero.maxExp = Math.floor(100 * Math.pow(1.25, hero.level - 1));
            hero.points += 5;
            leveledUp = true;

            // --- Learn Skill on Level Up ---
            if (hero.type === 'wolf' && hero.level === 6 && !hero.ownedSkills.includes('critical_strike')) {
                hero.ownedSkills.push('critical_strike');
                const skill = ASSETS_DB['critical_strike'];
                if (skill) newSkillsLearned.push(skill.name);
            }
            // Learn Fireball for Red Girl at Lv.7
            if (hero.type === 'girl' && hero.level === 7 && !hero.ownedSkills.includes('fireball')) {
                hero.ownedSkills.push('fireball');
                const skill = ASSETS_DB['fireball'];
                if (skill) newSkillsLearned.push(skill.name);
            }
        }

        let msg = `獲得 ${amount} 經驗!`;
        if (leveledUp) {
            msg += `\n升級了! (LV.${hero.level})`;
            if (newSkillsLearned.length > 0) {
                msg += `\n學會了新技能: ${newSkillsLearned.join(', ')}!`;
            }
        } else if (levelCapped) {
            msg += `\n\n(必須先擊敗枯木樹精才能升到11級)`;
        }
        if (droppedItems.length > 0) {
            msg += `\n獲得物品: ${droppedItems.map(item => item.name).join(', ')}!`;
        }

        this.saveGame();
        this.showModal(msg, true);
    }

    processTurn() {
        if (this.isPaused || this.mode !== 'BATTLE' || this.matchOver) return;
        if (!this.activePlayer && this.turnPhase !== PHASE.WAIT) return;

        if (this.turnPhase === PHASE.DECIDE) {
            this.turnTimer--;
            if (this.turnTimer <= 0) {

                if (this.activePlayer === this.p1 && this.pendingSkill) {
                    const skill = ASSETS_DB[this.pendingSkill.id];
                    spawnDamageText(this.activePlayer.x, this.activePlayer.y - 80, skill.name + "!", 'block');

                    this.pendingSkill.element.classList.remove('selected');
                    this.pendingSkill.element.classList.add('used');

                    // --- Consume Item on Use ---
                    if (skill.type === 'item') {
                        const hero = this.heroData[this.currentHeroIndex];

                        // Find the instanceId of the used item.
                        // We need to find which equipped item instance has the matching id.
                        // This assumes you can't equip two identical items and use them in the same turn,
                        // which is a safe assumption for now.
                        const usedItemInstanceId = hero.equippedSkills.find(slotId => {
                            if (typeof slotId === 'number') { // It's an instanceId
                                const item = hero.ownedItems.find(i => i.instanceId === slotId);
                                return item && item.id === skill.id;
                            }
                            return false;
                        });
                        if (usedItemInstanceId) {
                            hero.ownedItems = hero.ownedItems.filter(item => item.instanceId !== usedItemInstanceId);
                            hero.equippedSkills = hero.equippedSkills.filter(slotId => slotId !== usedItemInstanceId);
                        }
                    }

                    this.pendingSkill = null;

                    if (skill.id === 'crazy_slash') this.activePlayer.buffs.forceCombo = true;
                    else if (skill.id === 'critical_strike') this.activePlayer.buffs.forceCrit = true;
                    if (skill.id === 'wooden_sword') {
                        skill.effect(this.activePlayer);
                        this.activePlayer.holdingWeapon = 'wooden_sword';
                    }
                    else if (skill.id === 'dagger') {
                        skill.effect(this.activePlayer);
                        this.activePlayer.holdingWeapon = 'dagger'; // Add dagger visual state
                    }
                    if (skill.id === 'giants_strength') {
                        skill.effect(this.activePlayer);
                        this.activePlayer.state = STATE.SPECIAL; // 觸發特殊動畫
                    }
                    else if (skill.id === 'spiked_club') {
                        skill.effect(this.activePlayer);
                        this.activePlayer.holdingWeapon = 'spiked_club';
                    }
                    else if (skill.id === 'fireball') {
                        skill.effect(this.activePlayer);
                        // 火球特效可以在這裡觸發
                    }
                    else if (skill.id === 'shield') {
                        skill.effect(this.activePlayer);
                        this.updateHealthUI(); // Just in case, though it doesn't heal
                        this.turnPhase = PHASE.WAIT; // Skip attack, wait for next turn
                        this.turnTimer = 20;
                        return;
                    }
                    else if (skill.id === 'smokebomb') {
                        skill.effect(this.activePlayer);
                        this.updateHealthUI();
                        this.turnPhase = PHASE.WAIT; // Skip attack, wait for next turn
                        this.turnTimer = 20;
                        return;
                    }
                    // --- Healing Items ---
                    const healingItems = ['apple', 'water', 'banana', 'health_potion'];
                    if (healingItems.includes(skill.id)) {
                        const hpBefore = this.activePlayer.hp;
                        skill.effect(this.activePlayer);
                        const healedAmount = Math.floor(this.activePlayer.hp - hpBefore);
                        spawnDamageText(this.activePlayer.x, this.activePlayer.y - 60, `回復 +${healedAmount}`, 'heal');
                        this.updateHealthUI();
                        this.turnPhase = PHASE.WAIT; // Skip attack
                        this.turnTimer = 20;
                        return; // End decision phase immediately
                    }

                    this.turnPhase = PHASE.APPROACH;
                }
                // Determine Action
                if (this.activePlayer.buffs.forceCombo) {
                    this.action = 'COMBO';
                    this.comboCount = Math.floor(Math.random() * 4) + 3;
                    this.currentHit = 1;
                    this.activePlayer.buffs.forceCombo = false;
                    this.turnPhase = PHASE.APPROACH;
                }
                else if (this.activePlayer.buffs.forceCrit) {
                    this.action = 'CRITICAL';
                    this.activePlayer.isCrit = true;
                    this.activePlayer.buffs.forceCrit = false;
                    this.turnPhase = PHASE.APPROACH;
                }
                else if (this.turnPhase === PHASE.DECIDE && this.turnTimer <= 0) {
                    const rand = Math.random();
                    this.activePlayer.isCrit = false;

                    const tec = this.activePlayer.stats.tec;
                    const comboChance = tec * 0.01;
                    const critActionChance = this.activePlayer.stats.agi * 0.01;

                    const weightAttack = 100;
                    const weightCombo = tec * 2;
                    const weightCrit = this.activePlayer.stats.agi * 2;
                    const totalWeight = weightAttack + weightCombo + weightCrit;
                    const decision = Math.random() * totalWeight;

                    if (decision < weightAttack) {
                        this.action = 'ATTACK';
                    } else if (decision < weightAttack + weightCombo) {
                        this.action = 'COMBO';
                        this.comboCount = Math.floor(Math.random() * 4) + 2;
                        this.currentHit = 1;
                    } else {
                        this.action = 'CRITICAL';
                        this.activePlayer.isCrit = true;
                    }

                    this.turnPhase = PHASE.APPROACH;
                }
            }
        } else if (this.turnPhase === PHASE.APPROACH) {
            this.activePlayer.state = STATE.RUN;
            this.activePlayer.targetX = this.targetPlayer.x - (80 * this.activePlayer.facing);
            const dist = this.activePlayer.targetX - this.activePlayer.x;
            if (Math.abs(dist) > 5) {
                this.activePlayer.x += Math.sign(dist) * 12;
            } else {
                this.activePlayer.x = this.activePlayer.targetX;
                this.turnPhase = PHASE.ACT;
                this.turnTimer = 0;
            }
        } else if (this.turnPhase === PHASE.ACT) {
            this.turnTimer++;
            let pauseTime = (this.action === 'COMBO') ? 15 : 0;
            let swingTime = (this.action === 'COMBO') ? 15 : 30;

            if (this.turnTimer <= pauseTime) {
                this.activePlayer.state = STATE.IDLE;
                this.activePlayer.animFrame = 0;
            } else {
                this.activePlayer.state = STATE.ATTACK;
            }

            if (this.turnTimer > (pauseTime + swingTime)) {
                this.turnPhase = PHASE.IMPACT;
            }
        } else if (this.turnPhase === PHASE.IMPACT) {
            const { str, agi, tec } = this.activePlayer.stats;
            const targetAgi = this.targetPlayer.stats.agi;
            const targetTec = this.targetPlayer.stats.tec;

            let dodgeChance = targetAgi / (targetAgi + 200);
            let blockChance = targetTec / (targetTec + 200);

            const defenseRoll = Math.random();
            let defenseType = 'NONE';

            // Check for force buffs first
            if (this.targetPlayer.buffs.forceDodge) {
                defenseType = 'DODGE';
                this.targetPlayer.buffs.forceDodge = false; // Consume the buff
            }
            else if (this.targetPlayer.buffs.forceBlock) {
                defenseType = 'BLOCK';
                this.targetPlayer.buffs.forceBlock = false; // Consume the buff
            } else {
                if (defenseRoll < dodgeChance) defenseType = 'DODGE';
                else if (defenseRoll < dodgeChance + blockChance) defenseType = 'BLOCK';
            }

            // --- Damage Calculation Refactor ---
            let baseDmg = (str * 0.5) + (agi * 0.25) + (tec * 0.25);
            let bonusDmg = 0;

            // Apply Dagger's AGI buff
            const agiBonus = (agi * (this.activePlayer.buffs.agiMultiplier - 1)) * 0.25;
            bonusDmg += Math.floor(agiBonus);

            // Apply Item Buff
            baseDmg *= this.activePlayer.buffs.atkMultiplier;

            // Apply Giant's Strength Buff
            if (this.activePlayer.buffs.strBonusMultiplier > 0) {
                const strBonus = Math.floor(str * this.activePlayer.buffs.strBonusMultiplier);
                bonusDmg += strBonus;
            }

            // Apply Fireball Buff
            if (this.activePlayer.buffs.fireballBonus) {
                const tecBonus = Math.floor(tec * 0.8); // 造成 80% 技巧的額外傷害
                bonusDmg += tecBonus;
                this.activePlayer.buffs.fireballBonus = false; // 使用後重置
            }

            baseDmg += bonusDmg;

            let dmg = Math.floor(baseDmg + Math.random() * 4);
            let type = 'normal';

            const finalAtkAg = Math.floor(agi * this.activePlayer.buffs.agiMultiplier);
            let critChance = finalAtkAg * 0.01; // Use boosted AGI for crit chance
            if (this.action === 'CRITICAL' || Math.random() < critChance) { // Add random crit back since dagger boosts agi
                dmg = Math.floor(dmg * 2.0);
                type = 'crit';
            } else if (this.action === 'COMBO') {
                dmg = Math.floor(dmg * 0.8);
                type = 'combo';
            }

            if (defenseType === 'DODGE') {
                dmg = 0;
                this.targetPlayer.state = STATE.DODGE;
                this.targetPlayer.vx = -15 * this.targetPlayer.facing;
                spawnDamageText(this.targetPlayer.x, this.targetPlayer.y, "MISS", 'miss');
            } else if (defenseType === 'BLOCK') {
                dmg = Math.floor(dmg / 3);
                this.targetPlayer.state = STATE.BLOCK;
                let dmgX = this.targetPlayer.x - (this.targetPlayer.isP1 ? -60 : 60);
                spawnDamageText(dmgX, this.targetPlayer.y, "BLOCK " + dmg, 'block');
                for (let i = 0; i < 3; i++) this.particles.push(new Particle(this.targetPlayer.x, this.targetPlayer.y - 40, 'spark'));
            } else {
                this.targetPlayer.hp -= dmg;
                this.targetPlayer.state = STATE.HIT;
                let dmgX = this.targetPlayer.x - (this.targetPlayer.isP1 ? -60 : 60);
                let mainDmgText = dmg;
                if (bonusDmg > 0 && type !== 'crit') { // Don't show bonus on crit to avoid confusion
                    mainDmgText = `${dmg - bonusDmg} (+${bonusDmg})`;
                }
                let displayText = (type === 'crit') ? "CRIT " + mainDmgText : ((type === 'combo') ? `${this.currentHit}hit ${mainDmgText}` : mainDmgText);
                spawnDamageText(dmgX, this.targetPlayer.y, displayText, type);
                for (let i = 0; i < 5; i++) this.particles.push(new Particle(this.targetPlayer.x, this.targetPlayer.y - 40, 'dust'));
            }

            if (defenseType !== 'DODGE') {
                if (defenseType === 'BLOCK') {
                    this.targetPlayer.hp -= dmg;
                }
                this.targetPlayer.hp = Math.max(0, this.targetPlayer.hp);
            }

            // RESET BUFFS AFTER ATTACK
            if (this.turnPhase === PHASE.IMPACT) {
                // Reset temporary attack buffs
                this.activePlayer.buffs.atkMultiplier = 1.0;
                this.activePlayer.buffs.agiMultiplier = 1.0;
                this.activePlayer.buffs.strBonusMultiplier = 0; // 重設力量加成
                this.activePlayer.buffs.forceDodge = false; // Reset smokebomb buff if any
                this.activePlayer.buffs.forceBlock = false; // Reset shield buff if any
                this.activePlayer.buffs.fireballBonus = false; // 確保重置
                this.activePlayer.holdingWeapon = null;
            }

            this.updateHealthUI();

            if (this.targetPlayer.hp <= 0) {
                this.matchOver = true;
                if (this.activePlayer.isP1) {
                    const enemyLevel = this.targetPlayer.level;
                    const heroLevel = this.activePlayer.level;
                    const isBoss = this.targetPlayer.isBoss;
                    const enemyType = this.targetPlayer.type;

                    // --- Advanced EXP Calculation ---
                    const baseExp = 35; // Base EXP per level
                    let gainedExp = enemyLevel * baseExp;

                    // 1. Level Difference Multiplier
                    const levelDifference = enemyLevel - heroLevel;
                    const levelBonusMultiplier = 1 + (levelDifference * 0.1); // +10% EXP for each level higher
                    gainedExp *= Math.max(0.1, levelBonusMultiplier); // Min 10% EXP for low level mobs

                    // 2. Boss Bonus
                    if (isBoss) gainedExp *= 2.0;

                    // --- Unlock Level Cap on Boss Defeat ---
                    if (isBoss) {
                        const hero = this.heroData[this.currentHeroIndex];
                        const bossId = `${enemyType}_${enemyLevel}`;
                        if (!hero.defeatedBosses.includes(bossId)) {
                            hero.defeatedBosses.push(bossId);
                        }
                    }

                    // --- Item Drop Logic ---
                    const numberOfDrops = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
                    const droppedItems = [];
                    if (numberOfDrops > 0) {
                        const hero = this.heroData[this.currentHeroIndex];
                        for (let i = 0; i < numberOfDrops; i++) {
                            const randomItemIndex = Math.floor(Math.random() * DROPPABLE_ITEMS.length);
                            const itemId = DROPPABLE_ITEMS[randomItemIndex];
                            const newItemInstance = {
                                id: itemId,
                                instanceId: Date.now() + this.itemInstanceCounter++
                            };
                            hero.ownedItems.push(newItemInstance);
                            droppedItems.push(ASSETS_DB[itemId]); // For display message
                        }
                    }

                    this.gainExp(Math.floor(gainedExp), droppedItems);
                } else {
                    this.showModal(this.activePlayer.name + " WIN!", true);
                }

                this.targetPlayer.state = STATE.DEAD;
                this.activePlayer.state = STATE.WIN;
                this.activePlayer.isCrit = false;
                this.activePlayer.vx = 0;
                this.targetPlayer.vx = 0;

                return;
            }

            if (this.action === 'COMBO' && this.comboCount > 1 && defenseType !== 'DODGE') {
                this.comboCount--;
                this.currentHit++;
                this.turnPhase = PHASE.ACT;
                this.turnTimer = 0;
            } else {
                this.turnPhase = PHASE.RETREAT;
            }
        } else if (this.turnPhase === PHASE.RETREAT) {
            this.activePlayer.state = STATE.RUN;
            const targetX = this.activePlayer.startX;
            const dist = targetX - this.activePlayer.x;
            this.activePlayer.facing = this.activePlayer.isP1 ? -1 : 1;

            if (Math.abs(dist) > 10) {
                this.activePlayer.x += Math.sign(dist) * 15;
            } else {
                this.activePlayer.x = targetX;
                this.activePlayer.facing = this.activePlayer.isP1 ? 1 : -1;
                this.activePlayer.state = STATE.IDLE;
                this.turnPhase = PHASE.WAIT;
                this.turnTimer = 20;
            }
        } else if (this.turnPhase === PHASE.WAIT) {
            if (!this.targetPlayer) return;
            if (this.targetPlayer.state === STATE.DODGE) {
                this.targetPlayer.x = this.targetPlayer.startX;
                this.targetPlayer.state = STATE.IDLE;
                this.targetPlayer.vx = 0;
                this.targetPlayer.alpha = 1.0;
            }
            this.turnTimer--;
            if (this.turnTimer <= 0) {
                this.startTurn(this.targetPlayer);
            }
        }
    }

    drawLobbyBackground(ctx) {
        const grd = ctx.createLinearGradient(0, 0, 0, 400);
        grd.addColorStop(0, "#87CEEB");
        grd.addColorStop(1, "#E0F7FA");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 800, 600);

        ctx.fillStyle = "#81C784";
        ctx.beginPath(); ctx.arc(200, 600, 300, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(600, 600, 400, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#D7CCC8"; ctx.fillRect(100, 450, 100, 80);
        ctx.fillStyle = "#A1887F"; ctx.beginPath(); ctx.moveTo(90, 450); ctx.lineTo(150, 400); ctx.lineTo(210, 450); ctx.fill();
        ctx.fillStyle = "#5D4037"; ctx.fillRect(140, 490, 20, 40);

        ctx.fillStyle = "#D7CCC8"; ctx.fillRect(600, 420, 120, 90);
        ctx.fillStyle = "#8D6E63"; ctx.beginPath(); ctx.moveTo(590, 420); ctx.lineTo(660, 360); ctx.lineTo(730, 420); ctx.fill();
        ctx.fillStyle = "#5D4037"; ctx.fillRect(650, 470, 25, 40);

        ctx.fillStyle = "#4CAF50"; ctx.fillRect(0, 530, 800, 70);
    }

    drawForestBackground(ctx) {
        // Sky
        const grd = ctx.createLinearGradient(0, 0, 0, 400);
        grd.addColorStop(0, "#87CEEB"); // Light blue sky
        grd.addColorStop(1, "#E0F7FA"); // Lighter blue towards horizon
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 800, 600);

        // Sun
        ctx.fillStyle = 'rgba(255, 248, 225, 0.8)';
        ctx.beginPath(); ctx.arc(100, 100, 60, 0, Math.PI * 2); ctx.fill();

        // Distant Trees (as simple shapes)
        this.forestTrees.forEach(tree => {
            ctx.fillStyle = '#66bb6a'; // Lighter green
            ctx.beginPath();
            ctx.moveTo(tree.x, GROUND_Y); ctx.lineTo(tree.x + 50, GROUND_Y - tree.h); ctx.lineTo(tree.x + 100, GROUND_Y);
            ctx.fill();
        });

        // Ground
        ctx.fillStyle = '#388e3c'; ctx.fillRect(0, GROUND_Y, 800, 600 - GROUND_Y);
    }

    loop() {
        requestAnimationFrame(this.loop);
        if (this.isPaused) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.mode === 'LOBBY') {
            this.drawLobbyBackground(this.ctx);
        } else {
            if (this.p1 && this.p1.level < 11) {
                this.drawForestBackground(this.ctx);
            } else {
                // Dark Forest for level 10+
                const grd = this.ctx.createLinearGradient(0, 0, 0, 400);
                grd.addColorStop(0, "#4a5c48");
                grd.addColorStop(1, "#8ba688");
                this.ctx.fillStyle = grd;
                this.ctx.fillRect(0, 0, 800, 600);

                this.ctx.save();
                this.ctx.translate(400, 300);
                this.ctx.fillStyle = '#5d6d5e'; this.ctx.beginPath(); this.ctx.arc(0, 0, 150, 0, Math.PI * 2); this.ctx.fill();
                this.ctx.fillRect(-100, 80, 200, 100);
                this.ctx.fillStyle = '#2e3b28'; this.ctx.beginPath(); this.ctx.arc(-60, -20, 40, 0, Math.PI * 2); this.ctx.arc(60, -20, 40, 0, Math.PI * 2); this.ctx.fill();
                this.ctx.fillStyle = '#a5d6a7'; this.ctx.globalAlpha = 0.5; this.ctx.beginPath(); this.ctx.arc(-60, -20, 10, 0, Math.PI * 2); this.ctx.arc(60, -20, 10, 0, Math.PI * 2); this.ctx.fill(); this.ctx.globalAlpha = 1.0;
                this.ctx.fillStyle = '#2e3b28'; this.ctx.fillRect(-80, 100, 30, 40); this.ctx.fillRect(0, 100, 30, 40); this.ctx.fillRect(50, 100, 30, 40);
                this.ctx.strokeStyle = '#2e7d32'; this.ctx.lineWidth = 5; this.ctx.beginPath(); this.ctx.moveTo(-150, -50); this.ctx.bezierCurveTo(-100, 0, -120, 100, -80, 150); this.ctx.stroke();
                this.ctx.restore();

                this.ctx.fillStyle = '#388e3c'; this.ctx.fillRect(0, GROUND_Y, 800, 600 - GROUND_Y);
                this.ctx.fillStyle = '#4caf50'; for (let i = 0; i < 20; i++) { this.ctx.fillRect(i * 40, GROUND_Y, 30, 10); }
            }

            if (!this.matchOver && this.mode === 'BATTLE') this.processTurn();

            if (this.mode === 'BATTLE' && this.p1 && this.p2) {
                this.p1.update();
                this.p2.update();
                this.p1.draw(this.ctx);
                this.p2.draw(this.ctx);
            }
        }

        this.particles.forEach(p => {
            p.update();
            p.draw(this.ctx);
        });
    }

    updateHealthUI() {
        if (!this.p1 || !this.p2) return;
        const p1Pct = (this.p1.hp / this.p1.maxHp) * 100;
        const p2Pct = (this.p2.hp / this.p2.maxHp) * 100;
        document.getElementById('p1-life').style.width = Math.max(0, p1Pct) + '%';
        document.getElementById('p2-life').style.width = Math.max(0, p2Pct) + '%';
        document.getElementById('p1-life-text').innerText = `${Math.floor(Math.max(0, this.p1.hp))}/${this.p1.maxHp}`;
        document.getElementById('p2-life-text').innerText = `${Math.floor(Math.max(0, this.p2.hp))}/${this.p2.maxHp}`;
    }

    log(msg) {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerText = msg;
        const container = document.getElementById('battle-log');
        container.appendChild(div);
        if (container.children.length > 3) container.removeChild(container.firstChild);
    }

    showModal(text, showBtn = false) {
        const m = document.getElementById('turn-modal');
        const t = document.getElementById('turn-text');
        const btn = document.getElementById('modal-ok-btn');

        if (!text) {
            m.classList.remove('show');
        } else {
            t.innerText = text;
            m.classList.add('show');

            if (showBtn) btn.style.display = 'block';
            else btn.style.display = 'none';
        }
    }

    togglePause() { this.isPaused = !this.isPaused; }
    resetMatch() { this.startMatch(); }
}

const game = new Game();
