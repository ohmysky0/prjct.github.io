document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('tippForm');
    const results = document.getElementById('results');
    const themeToggle = document.getElementById('themeToggle');
    let gfrChart, riskFactorsChart, biomarkersChart, treatmentEffectivenessChart, gfrComparisonChart, renalFunctionChart, treatmentComparisonChart;

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        updateChartsTheme();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        showLoading();
        setTimeout(() => {
            calculateResults();
            hideLoading();
        }, 1000);
    });

    function showLoading() {
        const loadingElement = document.createElement('div');
        loadingElement.classList.add('loading');
        document.body.appendChild(loadingElement);
    }

    function hideLoading() {
        const loadingElement = document.querySelector('.loading');
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    function calculateResults() {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        if (parseInt(data.age) > 18) {
            alert('Калькулятор предназначен для пациентов до 18 лет согласно стандартам РФ.');
            return;
        }

        const initialGFR = calculateGFR(data);
        const gfrPrediction = predictGFR(initialGFR, data);
        const riskPrediction = calculateRisk(data, initialGFR);
        const mlPrediction = predictWithML(data);
        const biomarkersAnalysis = analyzeBiomarkers(data);
        const treatmentEffectiveness = predictTreatmentEffectiveness(data, initialGFR);
        const renalFunctionAnalysis = analyzeRenalFunction(data, initialGFR);

        displayResults(initialGFR, gfrPrediction, riskPrediction, mlPrediction, biomarkersAnalysis, treatmentEffectiveness, renalFunctionAnalysis);
        createCharts(gfrPrediction, riskPrediction, biomarkersAnalysis, treatmentEffectiveness, mlPrediction, renalFunctionAnalysis);

        results.classList.add('visible');
    }

    function calculateGFR(data) {
        const height = parseFloat(data.height); // рост в см
        const creatinine = parseFloat(data.creatinine); // креатинин в мкмоль/л
        const age = parseFloat(data.age);
        const gender = data.gender;
    
        let k;
        if (age <= 1) {
            k = 0.33;
        } else if (age <= 13) {
            k = gender === 'M' ? 0.55 : 0.55;
        } else {
            k = gender === 'M' ? 0.70 : 0.55;
        }
    
        let gfr = (k * height) / (creatinine / 88.4);
    
        // Корректировка для новорожденных и младенцев
        if (age < 2) {
            gfr *= (0.33 + (0.45 * age));
        }
    
        return Math.max(gfr, 0); // GFR не может быть отрицательным
    }

    function predictGFR(initialGFR, data) {
        const predictions = [initialGFR];
        const years = 5;
        const declineRate = calculateDeclineRate(data, initialGFR);

        for (let t = 1; t <= years; t++) {
            const predictedGFR = initialGFR * Math.exp(-declineRate * t);
            predictions.push(Math.max(predictedGFR, 0));
        }

        return predictions;
    }

    function calculateDeclineRate(data, initialGFR) {
        const age = parseFloat(data.age);
        const albuminuria = parseFloat(data.albuminuria);
        const hypertension = data.hypertension === 'on' ? 1 : 0;
        const tippStage = getTIPPStageValue(data.tippStage);
        const il6 = parseFloat(data.il6);
        const il8 = parseFloat(data.il8);
        const tnf = parseFloat(data.tnf);
        const tgf = parseFloat(data.tgf);

        return 0.005 + 
               0.0001 * albuminuria + 
               0.01 * hypertension + 
               0.003 * tippStage - 
               0.0001 * initialGFR + 
               0.00002 * il6 + 
               0.00002 * il8 + 
               0.00005 * tnf + 
               0.00002 * tgf + 
               0.0005 * Math.log(age + 1);
    }

    function calculateRisk(data, initialGFR) {
        const age = parseFloat(data.age);
        const albuminuria = parseFloat(data.albuminuria);
        const hypertension = data.hypertension === 'on' ? 1 : 0;
        const tippStage = getTIPPStageValue(data.tippStage);
        const renalInfection = parseFloat(data.renalInfection);
        const il6 = parseFloat(data.il6);
        const il8 = parseFloat(data.il8);
        const il10 = parseFloat(data.il10);
        const tnf = parseFloat(data.tnf);
        const tgf = parseFloat(data.tgf);
        const vd = parseFloat(data.vd);
        const vs = parseFloat(data.vs);

        const z = -5 + 
                  0.005 * age + 
                  0.00005 * albuminuria + 
                  0.1 * hypertension + 
                  0.05 * tippStage + 
                  0.01 * renalInfection - 
                  0.003 * initialGFR + 
                  0.001 * il6 + 
                  0.0015 * il8 - 
                  0.0005 * il10 + 
                  0.0015 * tnf + 
                  0.001 * tgf + 
                  0.01 * Math.log(vd/vs);
        return 1 / (1 + Math.exp(-z));
    }

    function getTIPPStageValue(stage) {
        const stageValues = { A: 1, B: 2, C: 3, D: 4 };
        return stageValues[stage];
    }

    function predictWithML(data) {
        const features = [
            parseFloat(data.age) / 18,
            parseFloat(data.creatinine) / 150,
            parseFloat(data.albuminuria) / 1000,
            parseFloat(data.il1) / 10,
            parseFloat(data.il6) / 20,
            parseFloat(data.il8) / 30,
            parseFloat(data.il10) / 10,
            parseFloat(data.tnf) / 40,
            parseFloat(data.tgf) / 40,
            parseFloat(data.vd) / 10,
            parseFloat(data.vs) / 30,
            getTIPPStageValue(data.tippStage) / 4,
            data.hypertension === 'on' ? 1 : 0,
            parseFloat(data.renalInfection) / 12
        ];

        const weights = [
            -0.02, -0.1, -0.08, -0.005, -0.02, -0.02,
            0.01, -0.05, -0.03, 0.05, 0.05, -0.15,
            -0.1, -0.05
        ];

        const bias = 1.1;
        const prediction = features.reduce((sum, feature, index) => sum + feature * weights[index], bias);

        const gfrPrediction = 120 / (1 + Math.exp(-prediction * 2));
        const riskScore = 1 / (1 + Math.exp(-(1 - prediction) * 3));

        return {
            gfrPrediction: Math.max(0, gfrPrediction),
            riskScore: riskScore
        };
    }

    function analyzeBiomarkers(data) {
        const biomarkers = ['il1', 'il6', 'il8', 'il10', 'tnf', 'tgf'];
        const analysis = {};
        const age = parseFloat(data.age);

        biomarkers.forEach(marker => {
            const value = parseFloat(data[marker]);
            let status, normalRange;
            
            if (age < 5) {
                normalRange = getChildBiomarkerRange(marker, 'infant');
            } else if (age < 12) {
                normalRange = getChildBiomarkerRange(marker, 'child');
            } else {
                normalRange = getChildBiomarkerRange(marker, 'adolescent');
            }

            status = value < normalRange[0] ? 'Низкий' : value > normalRange[1] ? 'Высокий' : 'Норма';
            analysis[marker] = { value, status, normalRange };
        });

        const inflammationIndex = calculateInflammationIndex(data);
        analysis.inflammationIndex = inflammationIndex;

        return analysis;
    }

    function getChildBiomarkerRange(marker, ageGroup) {
        const ranges = {
            il1: { infant: [1, 3], child: [2, 4], adolescent: [3, 5] },
            il6: { infant: [2, 6], child: [3, 8], adolescent: [4, 10] },
            il8: { infant: [3, 8], child: [5, 12], adolescent: [8, 15] },
            il10: { infant: [2, 5], child: [3, 7], adolescent: [4, 9] },
            tnf: { infant: [5, 15], child: [8, 20], adolescent: [10, 25] },
            tgf: { infant: [10, 20], child: [15, 25], adolescent: [20, 30] }
        };
        return ranges[marker][ageGroup];
    }

    function calculateInflammationIndex(data) {
        const il6 = parseFloat(data.il6);
        const il8 = parseFloat(data.il8);
        const tnf = parseFloat(data.tnf);
        const il10 = parseFloat(data.il10);

        return ((il6/5 + il8/10 + tnf/15) / (il10/8)) * 1.2;
    }

    function predictTreatmentEffectiveness(data, initialGFR) {
        const treatments = ['ИАПФ', 'БРА', 'Диуретики', 'Статины'];
        const baseEffectiveness = {
            'ИАПФ': 0.7,
            'БРА': 0.65,
            'Диуретики': 0.5,
            'Статины': 0.4
        };

        const tippStage = getTIPPStageValue(data.tippStage);
        const albuminuria = parseFloat(data.albuminuria);
        const hypertension = data.hypertension === 'on' ? 1 : 0;
        const age = parseFloat(data.age);
        const il6 = parseFloat(data.il6);
        const tnf = parseFloat(data.tnf);
        const vd = parseFloat(data.vd);
        const vs = parseFloat(data.vs);

        return treatments.map(treatment => {
            const effectiveness = Math.min(0.95, baseEffectiveness[treatment] + 
                                    0.01 * (5-tippStage) + 
                                    0.00001 * albuminuria + 
                                    0.015 * hypertension - 
                                    0.0003 * Math.max(0, age-10) + 
                                    0.0001 * initialGFR - 
                                    0.00003 * il6 - 
                                    0.00003 * tnf + 
                                    0.001 * (vs-vd)/vs);
            
            let recommendation = '';
            let explanation = '';

            if (effectiveness > 0.8) {
                recommendation = 'Высокоэффективно. Рекомендуется как основная терапия.';
                explanation = `${treatment} показывает высокую эффективность (${(effectiveness * 100).toFixed(2)}%) в данном случае. `;
            } else if (effectiveness > 0.6) {
                recommendation = 'Умеренно эффективно. Рекомендуется в комбинации с другими препаратами.';
                explanation = `${treatment} демонстрирует умеренную эффективность (${(effectiveness * 100).toFixed(2)}%). `;
            } else {
                recommendation = 'Низкая эффективность. Рассмотрите альтернативные методы лечения.';
                explanation = `${treatment} имеет низкую эффективность (${(effectiveness * 100).toFixed(2)}%) в данном случае. `;
            }

            switch(treatment) {
                case 'ИАПФ':
                    explanation += 'ИАПФ блокируют ренин-ангиотензин-альдостероновую систему, снижая внутриклубочковое давление и протеинурию. ';
                    explanation += 'Эффективность зависит от стадии ТИПП, уровня альбуминурии и наличия гипертензии. ';
                    break;
                case 'БРА':
                    explanation += 'БРА блокируют рецепторы ангиотензина II, что приводит к снижению артериального давления и протеинурии. ';
                    explanation += 'Эффективность сравнима с ИАПФ, но с меньшим риском побочных эффектов. ';
                    break;
                case 'Диуретики':
                    explanation += 'Диуретики помогают контролировать артериальное давление и уменьшать отеки. ';
                    explanation += 'Их эффективность зависит от стадии ТИПП и наличия гипертензии. ';
                    break;
                case 'Статины':
                    explanation += 'Статины могут замедлять прогрессирование ТИПП за счет противовоспалительного и антипротеинурического действия. ';
                    explanation += 'Эффективность зависит от уровня воспалительных маркеров и степени протеинурии. ';
                    break;
            }

            return {
                name: treatment,
                effectiveness: effectiveness,
                recommendation: recommendation,
                explanation: explanation
            };
        });
    }

    function analyzeRenalFunction(data, initialGFR) {
        const albuminuria = parseFloat(data.albuminuria);
        const creatinine = parseFloat(data.creatinine);
        const vd = parseFloat(data.vd);
        const vs = parseFloat(data.vs);
        const age = parseFloat(data.age);
    
        let ckdStage;
        if (age < 2) {
            // Для детей младше 2 лет используем другие критерии
            if (initialGFR < 15) ckdStage = 'Стадия 5';
            else if (initialGFR < 30) ckdStage = 'Стадия 4';
            else if (initialGFR < 45) ckdStage = 'Стадия 3';
            else if (initialGFR < 60) ckdStage = 'Стадия 2';
            else if (albuminuria > 30) ckdStage = 'Стадия 1';
            else ckdStage = 'Нет ХБП';
        } else {
            // Для детей старше 2 лет используем стандартные критерии
            if (initialGFR < 15) ckdStage = 'Стадия 5';
            else if (initialGFR < 30) ckdStage = 'Стадия 4';
            else if (initialGFR < 60) ckdStage = 'Стадия 3';
            else if (initialGFR < 90) ckdStage = 'Стадия 2';
            else if (albuminuria > 30) ckdStage = 'Стадия 1';
            else ckdStage = 'Нет ХБП';
        }
    
        const albuminuriaCategory = albuminuria < 30 ? 'A1' : albuminuria < 300 ? 'A2' : 'A3';
    
        const resistiveIndex = (vs - vd) / vs;
    
        return {
            ckdStage,
            albuminuriaCategory,
            creatinine,
            resistiveIndex
        };
    }

    function displayResults(initialGFR, gfrPrediction, riskPrediction, mlPrediction, biomarkersAnalysis, treatmentEffectiveness, renalFunctionAnalysis) {
        const gfrResult = document.getElementById('gfrResult');
        const riskResult = document.getElementById('riskResult');
        const mlResult = document.getElementById('mlResult');
        const treatmentResult = document.getElementById('treatmentResult');

        gfrResult.innerHTML = `
            <h3>Скорость клубочковой фильтрации (СКФ)</h3>
            <p>Исходная СКФ: ${initialGFR.toFixed(2)} мл/мин/1,73м<sup>2</sup></p>
            <p>Прогноз СКФ через 5 лет: ${gfrPrediction[5].toFixed(2)} мл/мин/1,73м<sup>2</sup></p>
            <p>Изменение СКФ: ${((gfrPrediction[5] - initialGFR) / initialGFR * 100).toFixed(2)}%</p>
            <p>Стадия ХБП: ${renalFunctionAnalysis.ckdStage}</p>
            <p>Категория альбуминурии: ${renalFunctionAnalysis.albuminuriaCategory}</p>
            <p>Индекс резистивности: ${renalFunctionAnalysis.resistiveIndex.toFixed(2)}</p>
        `;

        riskResult.innerHTML = `
            <h3>Риск прогрессирования</h3>
            <p>Риск прогрессирования до ХБП: ${(riskPrediction * 100).toFixed(2)}%</p>
            <p>Оценка риска (ML): ${(mlPrediction.riskScore * 100).toFixed(2)}%</p>
        `;

        mlResult.innerHTML = `
            <h3>Анализ биомаркеров</h3>
            <ul>
                ${Object.entries(biomarkersAnalysis).map(([marker, data]) => 
                    `<li>${marker.toUpperCase()}: ${data.value ? data.value.toFixed(2) : data} ${data.value ? 'пг/мл' : ''} ${data.status ? '- ' + data.status : ''} ${data.normalRange ? `(норма: ${data.normalRange[0]}-${data.normalRange[1]} пг/мл)` : ''}</li>`
                ).join('')}
            </ul>
        `;

        treatmentResult.innerHTML = `
            <h3>Эффективность лечения</h3>
            ${treatmentEffectiveness.map(treatment => `
                <h4>${treatment.name}</h4>
                <p>Эффективность: ${(treatment.effectiveness * 100).toFixed(2)}%</p>
                <p>Рекомендация: ${treatment.recommendation}</p>
                <p>Обоснование: ${treatment.explanation}</p>
            `).join('')}
        `;
    }

    function createCharts(gfrPrediction, riskPrediction, biomarkersAnalysis, treatmentEffectiveness, mlPrediction, renalFunctionAnalysis) {
        if (gfrChart) gfrChart.destroy();
        if (riskFactorsChart) riskFactorsChart.destroy();
        if (biomarkersChart) biomarkersChart.destroy();
        if (treatmentEffectivenessChart) treatmentEffectivenessChart.destroy();
        if (gfrComparisonChart) gfrComparisonChart.destroy();
        if (renalFunctionChart) renalFunctionChart.destroy();
        if (treatmentComparisonChart) treatmentComparisonChart.destroy();
    
        const ctx1 = document.getElementById('gfrChart').getContext('2d');
        const ctx2 = document.getElementById('riskFactorsChart').getContext('2d');
        const ctx3 = document.getElementById('biomarkersChart').getContext('2d');
        const ctx4 = document.getElementById('treatmentEffectivenessChart').getContext('2d');
        const ctx5 = document.getElementById('gfrComparisonChart').getContext('2d');
        const ctx6 = document.getElementById('renalFunctionChart').getContext('2d');
        const ctx7 = document.getElementById('treatmentComparisonChart').getContext('2d');
    
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false
        };
    
        gfrChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: Array.from({length: 6}, (_, i) => `Год ${i}`),
                datasets: [{
                    label: 'Прогноз СКФ',
                    data: gfrPrediction,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                ...chartOptions,
                plugins: {
                    title: {
                        display: true,
                        text: 'Прогноз изменения СКФ'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'СКФ (мл/мин/1,73м²)'
                        }
                    }
                }
            }
        });
    
        const riskFactors = [
            'Возраст',
            'Альбуминурия',
            'Гипертензия',
            'Стадия ТИПП',
            'Ренальная инфекция',
            'СКФ'
        ];
    
        riskFactorsChart = new Chart(ctx2, {
            type: 'radar',
            data: {
                labels: riskFactors,
                datasets: [{
                    label: 'Факторы риска',
                    data: [
                        parseFloat(form.age.value) / 18,
                        Math.min(parseFloat(form.albuminuria.value) / 1000, 1),
                        form.hypertension.checked ? 1 : 0,
                        getTIPPStageValue(form.tippStage.value) / 4,
                        parseFloat(form.renalInfection.value) / 12,
                        1 - (gfrPrediction[0] / 120)
                    ],
                    fill: true,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgb(255, 99, 132)',
                    pointBackgroundColor: 'rgb(255, 99, 132)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(255, 99, 132)'
                }]
            },
            options: {
                ...chartOptions,
                plugins: {
                    title: {
                        display: true,
                        text: 'Анализ факторов риска'
                    }
                },
                scales: {
                    r: {
                        angleLines: {
                            display: false
                        },
                        suggestedMin: 0,
                        suggestedMax: 1
                    }
                }
            }
        });
    
        biomarkersChart = new Chart(ctx3, {
            type: 'bar',
            data: {
                labels: Object.keys(biomarkersAnalysis).filter(key => key !== 'inflammationIndex'),
                datasets: [{
                    label: 'Значение',
                    data: Object.values(biomarkersAnalysis).filter(data => typeof data === 'object').map(data => data.value),
                    backgroundColor: Object.values(biomarkersAnalysis).filter(data => typeof data === 'object').map(data => 
                        data.status === 'Норма' ? 'rgba(75, 192, 192, 0.6)' :
                        data.status === 'Высокий' ? 'rgba(255, 99, 132, 0.6)' : 'rgba(255, 206, 86, 0.6)'
                    ),
                    borderColor: 'rgba(200, 200, 200, 0.8)',
                    borderWidth: 1
                }, {
                    label: 'Нижняя граница нормы',
                    data: Object.values(biomarkersAnalysis).filter(data => typeof data === 'object').map(data => data.normalRange[0]),
                    type: 'line',
                    fill: false,
                    borderColor: 'rgba(54, 162, 235, 0.8)',
                    borderDash: [5, 5]
                }, {
                    label: 'Верхняя граница нормы',
                    data: Object.values(biomarkersAnalysis).filter(data => typeof data === 'object').map(data => data.normalRange[1]),
                    type: 'line',
                    fill: false,
                    borderColor: 'rgba(255, 159, 64, 0.8)',
                    borderDash: [5, 5]
                }]
            },
            options: {
                ...chartOptions,
                plugins: {
                    title: {
                        display: true,
                        text: 'Анализ биомаркеров'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Значение (пг/мл)'
                        }
                    }
                }
            }
        });
    
        treatmentEffectivenessChart = new Chart(ctx4, {
            type: 'bar',
            data: {
                labels: treatmentEffectiveness.map(t => t.name),
                datasets: [{
                    label: 'Эффективность лечения',
                    data: treatmentEffectiveness.map(t => t.effectiveness * 100),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                ...chartOptions,
                plugins: {
                    title: {
                        display: true,
                        text: 'Прогноз эффективности лечения'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Эффективность (%)'
                        },
                        max: 100
                    }
                }
            }
        });
    
        gfrComparisonChart = new Chart(ctx5, {
            type: 'line',
            data: {
                labels: Array.from({length: 6}, (_, i) => `Год ${i}`),
                datasets: [{
                    label: 'Прогноз СКФ (формула)',
                    data: gfrPrediction,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }, {
                    label: 'Прогноз СКФ (ML)',
                    data: Array(6).fill(mlPrediction.gfrPrediction),
                    borderColor: 'rgb(255, 99, 132)',
                    borderDash: [5, 5],
                    tension: 0.1
                }]
            },
            options: {
                ...chartOptions,
                plugins: {
                    title: {
                        display: true,
                        text: 'Сравнение прогнозов СКФ'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'СКФ (мл/мин/1,73м²)'
                        }
                    }
                }
            }
        });
    
        renalFunctionChart = new Chart(ctx6, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Текущее состояние',
                    data: [{
                        x: renalFunctionAnalysis.resistiveIndex,
                        y: gfrPrediction[0]
                    }],
                    backgroundColor: 'rgb(255, 99, 132)'
                }]
            },
            options: {
                ...chartOptions,
                plugins: {
                    title: {
                        display: true,
                        text: 'Анализ функции почек'
                    },
                    annotation: {
                        annotations: {
                            box1: {
                                type: 'box',
                                xMin: 0,
                                xMax: 0.7,
                                yMin: 90,
                                yMax: 120,
                                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                                borderColor: 'rgba(75, 192, 192, 0.8)',
                                borderWidth: 1,
                                label: {
                                    content: 'Норма',
                                    enabled: true
                                }
                            },
                            line1: {
                                type: 'line',
                                yMin: 60,
                                yMax: 60,
                                borderColor: 'rgba(255, 99, 132, 0.8)',
                                borderWidth: 2,
                                label: {
                                    content: 'ХБП стадия 3',
                                    enabled: true
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Индекс резистивности'
                        },
                        min: 0,
                        max: 1
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'СКФ (мл/мин/1,73м²)'
                        },
                        min: 0,
                        max: 120
                    }
                }
            }
        });

        treatmentComparisonChart = new Chart(ctx7, {
            type: 'radar',
            data: {
                labels: treatmentEffectiveness.map(t => t.name),
                datasets: [{
                    label: 'Эффективность лечения',
                    data: treatmentEffectiveness.map(t => t.effectiveness * 100),
                    fill: true,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgb(75, 192, 192)',
                    pointBackgroundColor: 'rgb(75, 192, 192)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(75, 192, 192)'
                }]
            },
            options: {
                ...chartOptions,
                plugins: {
                    title: {
                        display: true,
                        text: 'Сравнение эффективности лечения'
                    }
                },
                scales: {
                    r: {
                        angleLines: {
                            display: false
                        },
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                }
            }
        });
    }
    
    function updateChartsTheme() {
        const isDarkTheme = document.body.classList.contains('dark-theme');
        const textColor = isDarkTheme ? '#ffffff' : '#666666';
        const gridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
        const charts = [gfrChart, riskFactorsChart, biomarkersChart, treatmentEffectivenessChart, gfrComparisonChart, renalFunctionChart, treatmentComparisonChart];
    
        charts.forEach(chart => {
            if (chart) {
                chart.options.plugins.title.color = textColor;
                chart.options.scales.x.ticks.color = textColor;
                chart.options.scales.x.grid.color = gridColor;
                chart.options.scales.y.ticks.color = textColor;
                chart.options.scales.y.grid.color = gridColor;
    
                if (chart.options.scales.r) {
                    chart.options.scales.r.pointLabels.color = textColor;
                    chart.options.scales.r.grid.color = gridColor;
                }
    
                chart.update();
            }
        });
    }
});