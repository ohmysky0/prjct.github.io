document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('skf-form');
    const result = document.getElementById('result');
    const skfPrediction = document.getElementById('skf-prediction');
    const statistics = document.getElementById('statistics');
    const additionalStatistics = document.getElementById('additional-statistics');
    const recommendations = document.getElementById('recommendations');
    let skfChart, riskFactorsChart, qualityOfLifeChart, ckdStageChart, complicationRiskChart;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = getFormData();
        const initialSKF = calculateInitialSKF(formData);
        const skfDecline = predictSKFDecline(formData);
        const yearlyResults = calculateYearlyResults(initialSKF, skfDecline, formData.years);

        displayResults(initialSKF, yearlyResults[formData.years], formData.years, skfDecline);
        updateCharts(yearlyResults, formData);
        displayStatistics(initialSKF, yearlyResults[formData.years], formData.years, skfDecline, formData);
        displayAdditionalStatistics(formData, initialSKF, yearlyResults[formData.years]);
        provideRecommendations(yearlyResults[formData.years], formData);

        result.style.display = 'block';
    });

    function getFormData() {
        return {
            age: parseInt(document.getElementById('age').value),
            gender: document.getElementById('gender').value,
            height: parseFloat(document.getElementById('height').value),
            weight: parseFloat(document.getElementById('weight').value),
            il1: parseFloat(document.getElementById('il1').value),
            il6: parseFloat(document.getElementById('il6').value),
            il8: parseFloat(document.getElementById('il8').value),
            il10: parseFloat(document.getElementById('il10').value),
            tnf: parseFloat(document.getElementById('tnf').value),
            tgf: parseFloat(document.getElementById('tgf').value),
            albumin: parseFloat(document.getElementById('albumin').value),
            vd: parseFloat(document.getElementById('vd').value),
            vs: parseFloat(document.getElementById('vs').value),
            years: parseInt(document.getElementById('years').value)
        };
    }

    function calculateInitialSKF(data) {
        const k = data.gender === 'female' ? 0.55 : 0.70;
        const scr = 0.7; // Предполагаемый уровень креатинина в сыворотке
        let skf = (k * data.height) / scr;
        
        if (data.age < 2) {
            skf *= 0.45;
        } else if (data.age < 13) {
            skf *= 0.55;
        } else {
            skf *= 0.65;
        }
        
        return Math.min(skf, 120);
    }

    function predictSKFDecline(data) {
        const baseDecline = 0.5;
        const inflammatoryFactor = (data.il1 + data.il6 + data.il8) / 3;
        const antiInflammatoryFactor = data.il10;
        const growthFactor = (data.tnf + data.tgf) / 2;
        const hemodynamicFactor = data.vs / data.vd;
        
        let decline = baseDecline + 
               (0.05 * inflammatoryFactor) + 
               (0.03 * growthFactor) - 
               (0.1 * antiInflammatoryFactor) + 
               (0.05 * data.albumin) - 
               (0.02 * hemodynamicFactor);
        
        if (data.age < 5) {
            decline *= 0.5;
        } else if (data.age < 10) {
            decline *= 0.7;
        } else if (data.age < 15) {
            decline *= 0.9;
        }
        
        return Math.max(decline, 0.1);
    }

    function calculateYearlyResults(initialSKF, skfDecline, years) {
        const results = {0: initialSKF};
        for (let i = 1; i <= years; i++) {
            results[i] = Math.max(initialSKF - (skfDecline * i), 0);
        }
        return results;
    }

    function displayResults(initialSKF, finalSKF, years, skfDecline) {
        skfPrediction.innerHTML = `
            <p><strong>Исходная СКФ:</strong> ${initialSKF.toFixed(2)} мл/мин/1.73м2</p>
            <p><strong>Прогнозируемая СКФ через ${years} ${years === 1 ? 'год' : 'лет'}:</strong> ${finalSKF.toFixed(2)} мл/мин/1.73м2</p>
            <p><strong>Прогнозируемое снижение:</strong> ${(initialSKF - finalSKF).toFixed(2)} мл/мин/1.73м2</p>
            <p><strong>Скорость снижения СКФ:</strong> ${skfDecline.toFixed(2)} мл/мин/1.73м2 в год</p>
            <p><strong>Исходная стадия ХБП:</strong> ${getCKDStage(initialSKF)}</p>
            <p><strong>Прогнозируемая стадия ХБП через ${years} ${years === 1 ? 'год' : 'лет'}:</strong> ${getCKDStage(finalSKF)}</p>
        `;
    }

    function updateCharts(yearlyResults, formData) {
        updateSKFChart(yearlyResults);
        updateRiskFactorsChart(formData);
        updateQualityOfLifeChart(yearlyResults);
        updateCKDStageChart(yearlyResults);
        updateComplicationRiskChart(yearlyResults);
    }

    function updateSKFChart(yearlyResults) {
        const ctx = document.getElementById('skf-chart').getContext('2d');
        
        if (skfChart) {
            skfChart.destroy();
        }

        const labels = Object.keys(yearlyResults);
        const data = Object.values(yearlyResults);

        skfChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'СКФ (мл/мин/1.73м2)',
                    data: data,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1,
                    fill: true
                }, {
                    label: 'Нормальное возрастное снижение',
                    data: labels.map(year => 100 - year * 0.5),
                    borderColor: 'rgb(192, 75, 75)',
                    borderDash: [5, 5],
                    fill: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Прогноз изменения СКФ'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    },
                    legend: {
                        position: 'bottom',
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Годы'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'СКФ (мл/мин/1.73м2)'
                        },
                        suggestedMin: 0,
                        suggestedMax: Math.max(...Object.values(yearlyResults)) + 10
                    }
                }
            }
        });
    }

    function updateRiskFactorsChart(formData) {
        const ctx = document.getElementById('risk-factors-chart').getContext('2d');
        
        if (riskFactorsChart) {
            riskFactorsChart.destroy();
        }

        const riskFactors = [
            formData.il1 * 0.05,
            formData.il6 * 0.03,
            formData.il8 * 0.02,
            formData.tnf * 0.01,
            formData.tgf * 0.02,
            formData.albumin * 0.005,
            formData.il10 * -0.1,
            formData.vd * -0.01,
            formData.vs * -0.005
        ];

        riskFactorsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['ИЛ-1', 'ИЛ-6', 'ИЛ-8', 'ФНО-α', 'ТФР-β', 'Альбуминурия', 'ИЛ-10', 'Vd', 'Vs'],
                datasets: [{
                    label: 'Вклад в снижение СКФ',
                    data: riskFactors,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(153, 102, 255, 0.5)',
                        'rgba(255, 159, 64, 0.5)',
                        'rgba(0, 255, 0, 0.5)',
                        'rgba(0, 0, 255, 0.5)',
                        'rgba(128, 128, 128, 0.5)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(0, 255, 0, 1)',
                        'rgba(0, 0, 255, 1)',
                        'rgba(128, 128, 128, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Вклад факторов риска в снижение СКФ'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Влияние на снижение СКФ (мл/мин/1.73м2 в год)'
                        }
                    }
                }
            }
        });
    }

    function updateQualityOfLifeChart(yearlyResults) {
        const ctx = document.getElementById('quality-of-life-chart').getContext('2d');
        
        if (qualityOfLifeChart) {
            qualityOfLifeChart.destroy();
        }

        const years = Object.keys(yearlyResults);
        const qualityOfLife = years.map(year => calculateQualityOfLife(yearlyResults[year]));

        qualityOfLifeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Качество жизни',
                    data: qualityOfLife,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Прогноз изменения качества жизни'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Годы'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Качество жизни (0-100)'
                        },
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                }
            }
        });
    }

    function updateCKDStageChart(yearlyResults) {
        const ctx = document.getElementById('ckd-stage-chart').getContext('2d');
        
        if (ckdStageChart) {
            ckdStageChart.destroy();
        }

        const years = Object.keys(yearlyResults);
        const ckdStages = years.map(year => getCKDStageNumber(yearlyResults[year]));

        ckdStageChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Стадия ХБП',
                    data: ckdStages,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    stepped: true,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Прогрессирование стадий ХБП'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Годы'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Стадия ХБП'
                        },
                        min: 1,
                        max: 5,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    function updateComplicationRiskChart(yearlyResults) {
        const ctx = document.getElementById('complication-risk-chart').getContext('2d');
        
        if (complicationRiskChart) {
            complicationRiskChart.destroy();
        }

        const years = Object.keys(yearlyResults);
        const complications = years.map(year => calculateComplicationRisks(yearlyResults[year]));

        complicationRiskChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    {
                        label: 'Риск анемии',
                        data: complications.map(c => c.anemia),
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    },
                    {
                        label: 'Риск гиперфосфатемии',
                        data: complications.map(c => c.hyperphosphatemia),
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    },
                    {
                        label: 'Риск гиперпаратиреоза',
                        data: complications.map(c => c.hyperparathyroidism),
                        borderColor: 'rgb(255, 206, 86)',
                        backgroundColor: 'rgba(255, 206, 86, 0.2)',
                    },
                    {
                        label: 'Риск ацидоза',
                        data: complications.map(c => c.acidosis),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Риски осложнений ХБП'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Годы'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Риск (%)'
                        },
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    }

    function calculateQualityOfLife(skf) {
        return Math.max(0, Math.min(100, 100 - (90 - skf) * 1.5));
    }

    function displayStatistics(initialSKF, finalSKF, years, skfDecline, formData) {
        const annualDeclineRate = ((initialSKF - finalSKF) / initialSKF / years) * 100;
        const timeToStage3 = (initialSKF - 60) / skfDecline;
        const timeToStage4 = (initialSKF - 30) / skfDecline;
        const timeToStage5 = (initialSKF - 15) / skfDecline;
        const resistanceIndex = calculateResistanceIndex(formData.vd, formData.vs);
        const esrdRisk5y = calculateESRDRisk(5, initialSKF, skfDecline);
        const esrdRisk10y = calculateESRDRisk(10, initialSKF, skfDecline);
        const cvdRisk = calculateCVDRisk(initialSKF, formData.age);
        const inflammatoryIndex = calculateInflammatoryIndex(formData);
        const fibroticIndex = calculateFibroticIndex(formData);

        statistics.innerHTML = `
            <h3>Дополнительная статистика:</h3>
            <div class="statistic-item"><strong>Годовая скорость снижения СКФ:</strong> ${annualDeclineRate.toFixed(2)}%</div>
            <div class="statistic-item"><strong>Время до ХБП 3 стадии:</strong> ${timeToStage3 > 0 ? timeToStage3.toFixed(1) + ' лет' : 'Уже достигнуто'}</div>
            <div class="statistic-item"><strong>Время до ХБП 4 стадии:</strong> ${timeToStage4 > 0 ? timeToStage4.toFixed(1) + ' лет' : 'Уже достигнуто'}</div>
            <div class="statistic-item"><strong>Время до ХБП 5 стадии:</strong> ${timeToStage5 > 0 ? timeToStage5.toFixed(1) + ' лет' : 'Уже достигнуто'}</div>
            <div class="statistic-item"><strong>Индекс резистентности почек:</strong> ${resistanceIndex.toFixed(2)}</div>
            <div class="statistic-item"><strong>Риск ТХПН через 5 лет:</strong> ${esrdRisk5y.toFixed(2)}%</div>
            <div class="statistic-item"><strong>Риск ТХПН через 10 лет:</strong> ${esrdRisk10y.toFixed(2)}%</div>
            <div class="statistic-item"><strong>Риск ССЗ:</strong> ${cvdRisk.toFixed(2)}%</div>
            <div class="statistic-item"><strong>Риск прогрессирования:</strong> ${calculateProgressionRisk(skfDecline)}</div>
            <div class="statistic-item"><strong>Индекс воспаления:</strong> ${inflammatoryIndex.toFixed(2)}</div>
            <div class="statistic-item"><strong>Индекс фиброза:</strong> ${fibroticIndex.toFixed(2)}</div>
            <div class="statistic-item"><strong>Достоверность прогноза:</strong> ${calculateReliability(initialSKF, skfDecline).toFixed(2)}%</div>
        `;
    }

    function calculateResistanceIndex(vd, vs) {
        return (vs - vd) / vs;
    }

    function calculateESRDRisk(years, initialSKF, skfDecline) {
        const finalSKF = initialSKF - (skfDecline * years);
        if (finalSKF < 15) {
            return 100 * (1 - Math.exp(-0.1 * (15 - finalSKF)));
        }
        return 0;
    }

    function calculateCVDRisk(skf, age) {
        return Math.min(100, Math.max(0, 10 + (60 - skf) * 0.3 + (age - 10) * 0.5));
    }

    function calculateProgressionRisk(skfDecline) {
        if (skfDecline <= 1) return "Низкий";
        if (skfDecline <= 2) return "Умеренный";
        if (skfDecline <= 4) return "Высокий";
        return "Очень высокий";
    }

    function calculateInflammatoryIndex(formData) {
        return (formData.il1 + formData.il6 + formData.il8 + formData.tnf) / formData.il10;
    }

    function calculateFibroticIndex(formData) {
        return formData.tgf / formData.il10;
    }

    function calculateReliability(initialSKF, skfDecline) {
        let reliability = 95 - (Math.abs(skfDecline) / initialSKF) * 100;
        return Math.max(Math.min(reliability, 95), 60);
    }

    function getCKDStage(skf) {
        if (skf >= 90) return "1 стадия";
        if (skf >= 60) return "2 стадия";
        if (skf >= 30) return "3 стадия";
        if (skf >= 15) return "4 стадия";
        return "5 стадия";
    }

    function getCKDStageNumber(skf) {
        if (skf >= 90) return 1;
        if (skf >= 60) return 2;
        if (skf >= 30) return 3;
        if (skf >= 15) return 4;
        return 5;
    }

    function calculateBMI(weight, height) {
        const heightInMeters = height / 100;
        return weight / (heightInMeters * heightInMeters);
    }

    function getAgeAdjustedBMIPercentile(bmi, age, gender) {
        // Здесь должна быть реализация расчета перцентиля ИМТ по возрасту и полу
        // Для точной реализации нужны референсные данные для детей в РФ
        // Возвращаем заглушку
        return 50;
    }

    function calculateRenalReplacementTherapyRisk(skf, age) {
        if (skf < 30) {
            const baseRisk = 100 - skf;
            const ageAdjustment = Math.max(0, (age - 10) * 2);
            return Math.min(100, baseRisk + ageAdjustment);
        }
        return 0;
    }

    function calculateMedicationEffectiveness(initialSKF, predictedSKF, medication) {
        const baseEffectiveness = (predictedSKF / initialSKF) * 100;
        switch(medication) {
            case 'ACEi':
                return baseEffectiveness * 1.2;
            case 'ARB':
                return baseEffectiveness * 1.15;
            case 'combined':
                return baseEffectiveness * 1.25;
            default:
                return baseEffectiveness;
        }
    }

    function calculateComplicationRisks(skf) {
        return {
            anemia: Math.max(0, Math.min(100, 100 - skf)),
            hyperphosphatemia: Math.max(0, Math.min(100, 120 - skf * 1.2)),
            hyperparathyroidism: Math.max(0, Math.min(100, 110 - skf * 1.1)),
            acidosis: Math.max(0, Math.min(100, 130 - skf * 1.3))
        };
    }

    function displayAdditionalStatistics(formData, initialSKF, finalSKF) {
        const bmi = calculateBMI(formData.weight, formData.height);
        const bmiPercentile = getAgeAdjustedBMIPercentile(bmi, formData.age, formData.gender);
        const rrtRisk = calculateRenalReplacementTherapyRisk(finalSKF, formData.age);
        const aceiEffectiveness = calculateMedicationEffectiveness(initialSKF, finalSKF, 'ACEi');
        const complications = calculateComplicationRisks(finalSKF);

        additionalStatistics.innerHTML = `
            <h3>Дополнительная статистика:</h3>
            <div class="statistic-item"><strong>ИМТ:</strong> ${bmi.toFixed(1)} кг/м² (${bmiPercentile} перцентиль)</div>
            <div class="statistic-item"><strong>Риск необходимости ЗПТ:</strong> ${rrtRisk.toFixed(1)}%</div>
            <div class="statistic-item"><strong>Эффективность иАПФ:</strong> ${aceiEffectiveness.toFixed(1)}%</div>
            <div class="statistic-item"><strong>Риск анемии:</strong> ${complications.anemia.toFixed(1)}%</div>
            <div class="statistic-item"><strong>Риск гиперфосфатемии:</strong> ${complications.hyperphosphatemia.toFixed(1)}%</div>
            <div class="statistic-item"><strong>Риск вторичного гиперпаратиреоза:</strong> ${complications.hyperparathyroidism.toFixed(1)}%</div>
            <div class="statistic-item"><strong>Риск метаболического ацидоза:</strong> ${complications.acidosis.toFixed(1)}%</div>
        `;
    }

    function provideRecommendations(finalSKF, formData) {
        let recommendationText = '<h3>Рекомендации:</h3>';
        const ckdStage = getCKDStageNumber(finalSKF);
        const inflammatoryIndex = calculateInflammatoryIndex(formData);
        const fibroticIndex = calculateFibroticIndex(formData);

        recommendationText += `
            <div class="recommendation-item">Регулярное наблюдение у нефролога (частота зависит от стадии ХБП)</div>
            <div class="recommendation-item">Контроль артериального давления (целевое значение < 130/80 мм рт. ст.)</div>
            <div class="recommendation-item">Ограничение потребления соли до 5-6 г/сутки</div>
            <div class="recommendation-item">Поддержание нормального индекса массы тела</div>
        `;

        if (ckdStage >= 2) {
            recommendationText += `
                <div class="recommendation-item">Ограничение потребления белка (0,8-1,0 г/кг/сут для стадии 2-3, 0,6-0,8 г/кг/сут для стадии 4-5)</div>
                <div class="recommendation-item">Рассмотрение назначения ингибиторов АПФ или БРА</div>
            `;
        }

        if (ckdStage >= 3) {
            recommendationText += `
                <div class="recommendation-item">Контроль анемии и назначение препаратов железа при необходимости</div>
                <div class="recommendation-item">Мониторинг и коррекция нарушений фосфорно-кальциевого обмена</div>
                <div class="recommendation-item">Профилактика и лечение метаболического ацидоза</div>
            `;
        }

        if (ckdStage >= 4) {
            recommendationText += `
                <div class="recommendation-item">Подготовка к заместительной почечной терапии</div>
                <div class="recommendation-item">Вакцинация против гепатита В</div>
                <div class="recommendation-item">Психологическая поддержка и обучение пациента</div>
            `;
        }

        if (inflammatoryIndex > 2) {
            recommendationText += `
                <div class="recommendation-item">Рассмотрение противовоспалительной терапии</div>
                <div class="recommendation-item">Усиленный контроль маркеров воспаления</div>
            `;
        }

        if (fibroticIndex > 1.5) {
            recommendationText += `
                <div class="recommendation-item">Рассмотрение антифибротической терапии</div>
                <div class="recommendation-item">Более частый мониторинг прогрессирования ХБП</div>
            `;
        }

        recommendations.innerHTML = recommendationText;
    }
});