// ============================================================
// ИВЕНТЫ ЗОНЫ (циклический игровой цикл)
// ============================================================

// Проверка таймеров инфекции и зомби каждую секунду
function startInfectionLoop() {
    setInterval(() => {

        // Обновление таймеров и статусов инфицирования / зомби в UI и сканере
        let isZomb = player.zombieTime && ((Date.now() - player.zombieTime) < ZOMBIE_TIME_MS);
        let isInf = player.infectionTime && ((Date.now() - player.infectionTime) < INFECTION_TIME_MS);

        // Применение красного интерфейса в режиме ЗОМБИ
        if (isZomb) {
            document.body.classList.add('zombie-interface');
        } else {
            document.body.classList.remove('zombie-interface');
        }

        // Карточки в меню скана
        let scanInfCard = document.getElementById('scan-infection-status-card');
        let scanZombCard = document.getElementById('scan-virus-status-card');

        if (scanInfCard && scanZombCard) {
            if (isInf) {
                scanInfCard.style.display = 'block';
                let infRem = Math.max(0, Math.ceil((INFECTION_TIME_MS - (Date.now() - player.infectionTime))/1000));
                let m = Math.floor(infRem / 60);
                let s = infRem % 60;
                let timerEl = document.getElementById('scan-infection-timer');
                if (timerEl) timerEl.innerText = `Осталось времени на лечение: ${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
            } else {
                scanInfCard.style.display = 'none';
            }

            if (isZomb) {
                scanZombCard.style.display = 'block';
                let zomRem = Math.max(0, Math.ceil((ZOMBIE_TIME_MS - (Date.now() - player.zombieTime))/1000));
                let m = Math.floor(zomRem / 60);
                let s = zomRem % 60;
                let timerEl = document.getElementById('scan-virus-timer');
                if (timerEl) timerEl.innerText = `Осталось до конца мутации: ${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
            } else {
                scanZombCard.style.display = 'none';
            }
        }

        // Статус в профиле (prof-karma)
        let karmaEl = document.getElementById('prof-karma');
        if (karmaEl) {
            if (isZomb) {
                karmaEl.innerText = '🧟 ЗОМБИ';
                karmaEl.className = 'danger';
            } else if (isInf) {
                karmaEl.innerText = '⚠️ ИНФИЦИРОВАН';
                karmaEl.className = 'rad-warning';
            }
        }

        let now = Date.now();

        // Фаза 1: Инфицирован (INFECTION_TIME_MS)
        if (player.infectionTime) {

            let remSec = Math.max(0, Math.ceil((INFECTION_TIME_MS - (now - player.infectionTime)) / 1000));

            let deadBanner = document.getElementById('dead-infection-banner');
            let deadTimerEl = document.getElementById('dead-infection-timer');
            if (deadBanner && deadTimerEl) {
                if (remSec > 0) {
                    deadBanner.style.display = 'block';
                    let mins = Math.floor(remSec / 60);
                    let secs = remSec % 60;
                    deadTimerEl.innerText = `Осталось времени на лечение: ${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
                } else {
                    deadBanner.style.display = 'none';
                }
            }

            if ((now - player.infectionTime) >= INFECTION_TIME_MS) {
                // Время вышло, не вылечился -> становимся ЗОМБИ (Фаза 2)
                player.infectionTime = 0;
                player.zombieTime = now;
                playSound('hazard');
                showBanner("ПОЛНАЯ ТРАНСФОРМАЦИЯ В ЗОМБИ!", 'var(--rad-color)');
                if (deadBanner) deadBanner.style.display = 'none';
            }
        } else {
            let deadBanner = document.getElementById('dead-infection-banner');
            if (deadBanner) deadBanner.style.display = 'none';
        }

        // Фаза 2: Зомби (ZOMBIE_TIME_MS)
        if (player.zombieTime) {
            if ((now - player.zombieTime) >= ZOMBIE_TIME_MS) {
                // Время зомби вышло -> вирус выгорел сам, возвращаемся в норму
                player.zombieTime = 0;
                playSound('heal');
                showBanner("ВИРУС ВЫГОРЕЛ! ВЫ СНОВА ЧЕЛОВЕК.", 'var(--quest-color)');
                saveState();
            }
        }
    }, 1000);
}

// Каждые 5 секунд обновляем метку присутствия и вычисляем время выживания
function startHeartbeatLoop() {
    setInterval(() => {
        let nowTime = Date.now();
        let prevHeartbeat = parseInt(localStorage.getItem('pda_heartbeat')) || nowTime;
        localStorage.setItem('pda_heartbeat', nowTime.toString());

        // Проверка ареста (10 минут блокировки)
        if (player.arrestedUntil && Date.now() < player.arrestedUntil) {
            if (!document.getElementById('view-dead').classList.contains('active') && player.hp > 0) {
                // Принудительно переводим на экран блокировки ареста
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                document.getElementById('view-dead').classList.add('active');
                document.getElementById('nav-buttons').style.display = 'none';
                let remMin = Math.ceil((player.arrestedUntil - Date.now()) / 60000);
                showBanner(`⚖ АРЕСТ! Ваш ПДА заблокирован военными еще на ${remMin} мин.`, 'var(--bandit-color)');
            }
        }

        if (!player.inBase && player.hp > 0 && (!player.arrestedUntil || Date.now() >= player.arrestedUntil)) {
            // Начисление зарплаты (Рабочий: +3💎/мин, Военный: +5💎/мин)
            if (player.role === 'Рабочий' || player.role === 'Военный') {
                player.salaryTimer = (player.salaryTimer || 0) + 5;
                if (player.salaryTimer >= 60) {
                    let pay = player.role === 'Военный' ? 5 : 3;
                    player.score += pay;
                    player.salaryTimer = 0;
                    playSound('sell');
                    showBanner(`💼 ЖАЛОВАНИЕ (${player.role.toUpperCase()}): +${pay} 💎`, 'var(--trade-color)');
                    saveState();
                }
            }

            let diffSec = Math.floor((nowTime - prevHeartbeat) / 1000);
            if (diffSec > 0 && diffSec < 60) { // Игнорируем скачки оффлайна (их обрабатывает оффлайн-обработчик отдельно)
                player.stats.survivedSeconds = (player.stats.survivedSeconds || 0) + diffSec;

                // Эффект регенерации 5 уровня Убежища (+1 HP в минуту = 1 HP за 60 секунд)
                if (player.shelterLevel >= 5) {
                    player.regenTimer = (player.regenTimer || 0) + diffSec;
                    if (player.regenTimer >= 60) {
                        let maxHp = getEffectiveMaxHp();
                        if (player.hp < maxHp) {
                            player.hp = Math.min(maxHp, player.hp + 1);
                            updateHUD();
                        }
                        player.regenTimer = 0;
                    }
                }
            }
        }
    }, 5000);
}

function startEventLoop() {
    setInterval(() => {
        if (player.inBase || player.hp <= 0) return;
        if (player.weapons) {
            let changed = false;
            for (let wName in player.weapons) {
                let w = player.weapons[wName];
                if (w.active && w.durability > 0) {
                    let wear = Math.floor(Math.random() * 3) + 1;

                    // Снижение износа оружия у Торговца Сидоровича (10% за каждый уровень, вплоть до 100% при Ур. 10)
                    let tradRep = (player.npcRep && player.npcRep['npc_trad']) || 0;
                    let tradLvl = getNpcRepLevel(tradRep);
                    let wearMult = Math.max(0, 1 - (tradLvl * 0.1));
                    // Убежище 3 ур: износ оружия на 10% медленнее (коэффициент 0.9)
                    if (player.shelterLevel >= 3) {
                        wearMult = wearMult * 0.9;
                    }
                    wear = Math.round(wear * wearMult);

                    w.durability = Math.max(0, w.durability - wear);
                    changed = true;
                }
            }
            if (changed && document.getElementById('view-profile').classList.contains('active')) {
                renderProfile();
            }
        }

        let hungerLoss = 3;
        if (player.equipment === 'eq_hunger') hungerLoss = 1;
        // Убежище 1 ур: сытость тратится на 10% медленнее (коэффициент 0.9)
        if (player.shelterLevel >= 1) {
            hungerLoss = Math.max(1, Math.round(hungerLoss * 0.9));
        }
        player.hunger = Math.max(0, player.hunger - hungerLoss);

        if (player.karma_score < 3) {
            let radGain = Math.max(1, Math.round(2 * getRadMultiplier()));
            // Убежище 2 ур: радиация накапливается на 10% медленнее (коэффициент 0.9)
            if (player.shelterLevel >= 2) {
                radGain = Math.max(1, Math.round(radGain * 0.9));
            }
            player.rads = Math.min(MAX_RADS, player.rads + radGain);
        } else {
            player.rads = 0;
        }

        let maxHp = getEffectiveMaxHp();
        if (player.hp > maxHp) player.hp = maxHp;

        if (player.hunger === 0 && player.hp > 0) {
            let hungerDmg = (player.equipment === 'eq_hunger') ? 2 : 5;
            player.hp = Math.max(0, player.hp - hungerDmg);
            playSound('hazard');
            showBanner('☣ ВЫ УМИРАЕТЕ ОТ ГОЛОДА (-' + hungerDmg + ' HP)', COLOR_BANDIT);
            checkDeathState();
        }

        saveState();

        if (Math.random() < 0.1 && player.hp > 0) {
            let ev = [
                {
                    m: '☣ РАДИАЦИОННАЯ БУРЯ! (+15 РАД)',
                    a: () => {
                        if (player.equipment === 'eq_storm') {
                            showBanner('🛡 ШТОРМОВОЙ КОМПЕНСАТОР ОТРАЗИЛ БУРЮ', 'var(--trade-color)');
                            return;
                        }
                        let radGain = Math.max(2, Math.round(15 * getRadMultiplier()));
                        if (player.karma_score < 3) {
                            player.rads = Math.min(MAX_RADS, player.rads + radGain);
                        } else {
                            showBanner('☣ РАДИАЦИОННЫЙ ИММУНИТЕТ ГЕРОЯ ЗАЩИТИЛ ВАС', COLOR_HERO);
                        }
                        checkDeathState();
                    }
                },
                {
                    m: '⚠ ТОКСИЧНЫЕ СПОРЫ! ВЫ ГОЛОДАЕТЕ (-20 ЕДА)',
                    a: () => {
                        if (player.equipment === 'eq_storm') {
                            showBanner('🛡 ШТОРМОВОЙ КОМПЕНСАТОР ОТРАЗИЛ СПОРЫ', 'var(--trade-color)');
                            return;
                        }
                        player.hunger = Math.max(0, player.hunger - 20);
                        checkDeathState();
                    }
                },
                {
                    m: '🐺 НАПАДЕНИЕ МУТАНТОВ! Активное оружие повреждено в бою (-15% прочности)',
                    a: () => {
                        let damaged = false;
                        if (player.weapons) {
                            for (let wName in player.weapons) {
                                let w = player.weapons[wName];
                                if (w.active && w.durability > 0) {
                                    w.durability = Math.max(0, w.durability - 15);
                                    damaged = true;
                                }
                            }
                        }
                        if (damaged) {
                            showBanner('🐺 НАПАДЕНИЕ МУТАНТОВ! Оружие повреждено в бою (-15% прочности)', 'var(--bandit-color)');
                        } else {
                            showBanner('🐺 НАПАДЕНИЕ МУТАНТОВ! У вас не было активного оружия для самообороны, вы ранены (-10 HP)', 'var(--bandit-color)');
                            player.hp = Math.max(0, player.hp - 10);
                            checkDeathState();
                        }
                    }
                },
                {
                    m: '🌪 ПЫЛЕВАЯ БУРЯ! Оружие засорено пылью и песком (-10% прочности)',
                    a: () => {
                        let damaged = false;
                        if (player.weapons) {
                            for (let wName in player.weapons) {
                                let w = player.weapons[wName];
                                if (w.active && w.durability > 0) {
                                    w.durability = Math.max(0, w.durability - 10);
                                    damaged = true;
                                }
                            }
                        }
                        if (damaged) {
                            showBanner('🌪 ПЫЛЕВАЯ БУРЯ! Механизмы засорены (-10% прочности)', 'var(--rad-color)');
                        } else {
                            showBanner('🌪 ПЫЛЕВАЯ БУРЯ! Песок забился в снаряжение.', 'var(--rad-color)');
                        }
                    }
                }
            ][Math.floor(Math.random() * 4)];
            ev.a(); saveState(); playSound('hazard');
            if (player.equipment !== 'eq_storm') {
                showBanner(ev.m, COLOR_RAD);
            }
        }
    }, 60000);
}
