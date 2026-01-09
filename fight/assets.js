// --- ASSET DATABASE (Merged Skills & Items) ---
const ASSETS_DB = {
    // SKILLS
    'crazy_slash': {
        id: 'crazy_slash',
        name: '瘋狂斬擊',
        desc: '下一回合必定連擊。', // Updated Description
        icon: '連', 
        displayName: '瘋狂斬擊', 
        type: 'skill',
        effect: (user) => { user.buffs.forceCombo = true; }
    },
    'critical_strike': {
        id: 'critical_strike',
        name: '會心一擊',
        desc: '下一回合必定暴擊。',
        icon: '暴', 
        displayName: '會心一擊', 
        type: 'skill',
        effect: (user) => { user.buffs.forceCrit = true; }
    },
    'giants_strength': {
        id: 'giants_strength',
        name: '巨人之力',
        desc: '下次攻擊附加50%自身力量的傷害。',
        icon: '力',
        displayName: '巨人之力',
        type: 'skill',
        effect: (user) => { user.buffs.strBonusMultiplier = 0.5; }
    },
    'fireball': {
        id: 'fireball',
        type: 'skill',
        name: '火球術',
        displayName: '火球術',
        desc: '對敵人投擲一顆火球，造成基於技巧 (TEC) 的額外傷害。',
        effect: (caster) => {
            caster.buffs.fireballBonus = true; // 設置一個臨時狀態
        }
    },
    // ITEMS
    'wooden_sword': {
        id: 'wooden_sword',
        name: '木劍',
        desc: '下次攻擊增加攻擊力20%。', // Updated
        icon: '劍',
        displayName: '木劍',
        type: 'item',
        effect: (user) => { 
            user.buffs.atkMultiplier = (user.buffs.atkMultiplier || 1) + 0.2; 
        }
    },
    'dagger': {
        id: 'dagger',
        name: '匕首',
        desc: '下次攻擊增加敏捷的50%。',
        icon: '匕', 
        displayName: '匕首', 
        type: 'item',
        effect: (user) => { 
            user.buffs.agiMultiplier = (user.buffs.agiMultiplier || 1) + 0.5; 
        }
    },
    'spiked_club': {
        id: 'spiked_club',
        name: '狼牙棒',
        desc: '下次攻擊附加力量20%，並且必定暴擊。',
        icon: '棒',
        displayName: '狼牙棒',
        type: 'item',
        effect: (user) => {
            user.buffs.strBonusMultiplier = 0.2;
            user.buffs.forceCrit = true;
        }
    },
    'water': {
        id: 'water',
        name: '水',
        desc: '使用後回復生命75點。',
        icon: '水',
        displayName: '水',
        type: 'item',
        effect: (user) => {
            user.hp = Math.min(user.maxHp, user.hp + 75);
        }
    },
    'banana': {
        id: 'banana',
        name: '香蕉',
        desc: '使用後回復生命120點。',
        icon: '蕉',
        displayName: '香蕉',
        type: 'item',
        effect: (user) => {
            user.hp = Math.min(user.maxHp, user.hp + 120);
        }
    },
    'apple': {
        id: 'apple',
        name: '蘋果',
        desc: '使用後回復生命180點。',
        icon: '蘋',
        displayName: '蘋果',
        type: 'item',
        effect: (user) => {
            user.hp = Math.min(user.maxHp, user.hp + 180);
        }
    },
    'health_potion': {
        id: 'health_potion',
        name: '生命藥水',
        desc: '使用後回復生命240點。',
        icon: '藥',
        displayName: '生命藥水',
        type: 'item',
        effect: (user) => {
            user.hp = Math.min(user.maxHp, user.hp + 240);
        }
    },
    'shield': {
        id: 'shield',
        name: '盾牌',
        desc: '使用後，下次受擊時必定格檔。',
        icon: '盾',
        displayName: '盾牌',
        type: 'item',
        effect: (user) => {
            user.buffs.forceBlock = true;
        }
    },
    'smokebomb': {
        id: 'smokebomb',
        name: '煙霧彈',
        desc: '使用後，下次受擊時必定閃避。',
        icon: '煙',
        displayName: '煙霧彈',
        type: 'item',
        effect: (user) => {
            user.buffs.forceDodge = true;
        }
    }
};