import React, { useState, useEffect } from 'react'
import { createKernel } from '@nori/core-kernel'
import { createPersonalityTest } from './test.js'
import './App.css'

function App() {
  const [kernel, setKernel] = useState(null)
  const [tick, setTick] = useState(0)
  const [currentView, setCurrentView] = useState('intro') // 'intro', 'test', 'results'
  const [questionsData, setQuestionsData] = useState(null)
  const [latentTraitsData, setLatentTraitsData] = useState(null)

  useEffect(() => {
    // 두 개의 JSON 파일을 병렬로 로드
    Promise.all([
      fetch('./data/questions.json').then(response => {
        if (!response.ok) throw new Error('questions.json 로드 실패')
        return response.json()
      }),
      fetch('./data/latent.json').then(response => {
        if (!response.ok) throw new Error('latent.json 로드 실패')
        return response.json()
      })
    ])
      .then(([questionsData, latentData]) => {
        // 데이터 유효성 검사
        if (!questionsData.questions) {
          throw new Error('questions.json 데이터 형식이 올바르지 않습니다.')
        }
        if (!latentData.categories) {
          throw new Error('latent.json 데이터 형식이 올바르지 않습니다.')
        }
        
        setQuestionsData(questionsData)
        setLatentTraitsData(latentData.categories)
        
        // 커널 초기화
        const k = createKernel('personality-test-seed', [
          createPersonalityTest()
        ])
        
        // 문항 데이터 로드
        k.dispatch('personalityTest', 'loadQuestions', {
          questions: questionsData.questions
        })
        
        // 잠재특성 데이터 로드
        k.dispatch('personalityTest', 'loadLatentTraits', {
          latentTraitsData: latentData.categories
        })
        
        // 테스트 시작
        k.dispatch('personalityTest', 'startTest')
        
        setKernel(k)
        setTick(1)
      })
      .catch(error => {
        console.error('데이터 로드 실패:', error)
        // 사용자에게 에러 메시지 표시
        alert(`데이터 로드에 실패했습니다: ${error.message}`)
      })
  }, [])

  useEffect(() => {
    if (!kernel) return

    // 이벤트 구독으로 자동 리렌더
    const rerender = () => setTick(t => t + 1)
    kernel.ctx.bus.on('effects.applied', rerender)
    
    return () => {
      kernel.ctx.bus.off('effects.applied', rerender)
    }
  }, [kernel])

  if (!kernel || !questionsData || !latentTraitsData) return <div>로딩 중...</div>

  const state = kernel.ctx.state.personalityTest
  const currentQuestion = state.questions[state.currentQuestionIndex]

  const handleChoice = (choiceIndex) => {
    kernel.dispatch('personalityTest', 'chooseAnswer', {
      questionIndex: state.currentQuestionIndex,
      choiceIndex
    })
  }

  const handlePrevious = () => {
    kernel.dispatch('personalityTest', 'goToPrevious')
  }

  const handleGoToQuestion = (questionIndex) => {
    kernel.dispatch('personalityTest', 'goToQuestion', { questionIndex })
  }

  const startTest = () => {
    setCurrentView('test')
    kernel.dispatch('personalityTest', 'startTest')
  }

  const showResults = () => {
    setCurrentView('results')
  }

  const backToTest = () => {
    setCurrentView('test')
  }

  const restartTest = () => {
    setCurrentView('test')
    kernel.dispatch('personalityTest', 'startTest')
  }

  // 진행률 계산
  const progress = (state.answers.filter(a => a !== undefined).length / state.questions.length) * 100

  // 잠재특성 렌더링 함수
  const renderLatentTraits = () => {
    if (!latentTraitsData) return null
    
    return Object.keys(latentTraitsData).map(categoryKey => {
      const category = latentTraitsData[categoryKey]
      return (
        <div key={categoryKey} className="trait-category">
          <h3>{category.name}</h3>
          <p className="category-description">{category.description}</p>
          <div className="traits-grid">
            {Object.keys(category.traits).map(traitKey => {
              const trait = category.traits[traitKey]
              const traitValue = state.latentTraits[traitKey] || 0
              return (
                <div key={traitKey} className="trait-item">
                  <label>{trait.label}</label>
                  <div className="trait-bar">
                    <div 
                      className="trait-fill" 
                      style={{ 
                        width: `${((traitValue + 1) / 2) * 100}%`,
                        backgroundColor: traitValue > 0 ? '#4CAF50' : '#f44336'
                      }}
                    ></div>
                  </div>
                  <span className="trait-value">{traitValue.toFixed(2)}</span>
                  <div className="trait-poles">
                    <span className="negative-pole">{trait.negativePole.name}</span>
                    <span className="positive-pole">{trait.positivePole.name}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    })
  }

  if (currentView === 'intro') {
    return (
      <div className="app">
        <div className="intro-container">
          <h1>성격유형검사</h1>
          <p>당신의 성격을 분석해보세요!</p>
          <p>{state.questions.length}개의 문항에 답변하면 잠재 특성과 최종 결과를 확인할 수 있습니다.</p>
          <button className="start-btn" onClick={startTest}>
            검사 시작하기
          </button>
        </div>
      </div>
    )
  }

  if (currentView === 'results') {
    return (
      <div className="app">
        <div className="results-container">
          <h1>검사 결과</h1>
          
          <div className="results-section">
            <h2>잠재 특성</h2>
            {renderLatentTraits()}
          </div>

          <div className="results-section">
            <h2>3축 모델 최종 결과</h2>
            
            {/* 축 1: 정신의 권력 구조 */}
            <div className="axis-section">
              <h3>축 1: 정신의 권력 구조</h3>
              <p className="axis-description">"나를 움직이는 근본 동력은 무엇인가?"</p>
              <div className="axis-results">
                <div className="axis-result-item">
                  <h4>원초아 (Id)</h4>
                  <div className="result-circle">
                    <span className="result-value">{state.finalResults.id.toFixed(2)}</span>
                  </div>
                  <p>본능적 욕구와 쾌락 추구</p>
                </div>
                
                <div className="axis-result-item">
                  <h4>자아 (Ego)</h4>
                  <div className="result-circle">
                    <span className="result-value">{state.finalResults.ego.toFixed(2)}</span>
                  </div>
                  <p>현실적 판단과 균형 감각</p>
                </div>
                
                <div className="axis-result-item">
                  <h4>초자아 (Superego)</h4>
                  <div className="result-circle">
                    <span className="result-value">{state.finalResults.superego.toFixed(2)}</span>
                  </div>
                  <p>도덕적 신념과 사회 규범</p>
                </div>
              </div>
            </div>

            {/* 축 2: 세상과의 관계 맺기 */}
            <div className="axis-section">
              <h3>축 2: 세상과의 관계 맺기</h3>
              <p className="axis-description">"내가 세상과 상호작용하는 방식은 어떠한가?"</p>
              <div className="axis-results">
                <div className="axis-result-item">
                  <h4>구강기적 (Oral)</h4>
                  <div className="result-circle">
                    <span className="result-value">{state.finalResults.oral.toFixed(2)}</span>
                  </div>
                  <p>연결과 수용을 통한 관계</p>
                </div>
                
                <div className="axis-result-item">
                  <h4>항문기적 (Anal)</h4>
                  <div className="result-circle">
                    <span className="result-value">{state.finalResults.anal.toFixed(2)}</span>
                  </div>
                  <p>통제와 질서를 통한 관계</p>
                </div>
                
                <div className="axis-result-item">
                  <h4>남근기적 (Phallic)</h4>
                  <div className="result-circle">
                    <span className="result-value">{state.finalResults.phallic.toFixed(2)}</span>
                  </div>
                  <p>경쟁과 성취를 통한 관계</p>
                </div>
              </div>
            </div>

            {/* 축 3: 존재의 질서 */}
            <div className="axis-section">
              <h3>축 3: 존재의 질서</h3>
              <p className="axis-description">"세상을 이해하고 질서를 부여하는 나만의 방식은 무엇인가?"</p>
              <div className="axis-results">
                <div className="axis-result-item">
                  <h4>질서 (Order)</h4>
                  <div className="result-circle">
                    <span className="result-value">{state.finalResults.order.toFixed(2)}</span>
                  </div>
                  <p>합법칙적이고 구조적인 세계관</p>
                </div>
                
                <div className="axis-result-item">
                  <h4>균형 (Balance)</h4>
                  <div className="result-circle">
                    <span className="result-value">{state.finalResults.balance.toFixed(2)}</span>
                  </div>
                  <p>질서와 혼돈의 조화 추구</p>
                </div>
                
                <div className="axis-result-item">
                  <h4>혼돈 (Chaos)</h4>
                  <div className="result-circle">
                    <span className="result-value">{state.finalResults.chaos.toFixed(2)}</span>
                  </div>
                  <p>유동적이고 예측 불가한 세계관</p>
                </div>
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn" onClick={backToTest}>검사로 돌아가기</button>
            <button className="btn primary" onClick={restartTest}>다시 검사하기</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="test-container">
        <div className="header">
          <h1>성격유형검사</h1>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="progress-text">
            {state.currentQuestionIndex + 1} / {state.questions.length}
          </p>
        </div>

        <div className="question-container">
          <h2 className="question-text">{currentQuestion.text}</h2>
          
          <div className="choices-container">
            {currentQuestion.choices.map((choice, index) => (
              <button
                key={index}
                className={`choice-btn ${state.answers[state.currentQuestionIndex] === index ? 'selected' : ''}`}
                onClick={() => handleChoice(index)}
              >
                {choice.text}
              </button>
            ))}
          </div>
        </div>

        <div className="navigation">
          <button 
            className="nav-btn" 
            onClick={handlePrevious}
            disabled={state.currentQuestionIndex === 0}
          >
            이전
          </button>
          
          <div className="question-dots">
            {state.questions.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === state.currentQuestionIndex ? 'active' : ''} ${state.answers[index] !== undefined ? 'answered' : ''}`}
                onClick={() => handleGoToQuestion(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {progress === 100 && (
            <button className="nav-btn primary" onClick={showResults}>
              결과 보기
            </button>
          )}
        </div>

        {/* 실시간 특성 모니터링 */}
        <div className="traits-monitor">
          <h3>실시간 특성 변화</h3>
          {latentTraitsData && Object.keys(latentTraitsData).map(categoryKey => {
            const category = latentTraitsData[categoryKey]
            return (
              <div key={categoryKey} className="trait-category-preview">
                <h4>{category.name}</h4>
                <div className="traits-preview">
                  {Object.keys(category.traits).map(traitKey => {
                    const trait = category.traits[traitKey]
                    const traitValue = state.latentTraits[traitKey] || 0
                    return (
                      <div key={traitKey} className="trait-preview">
                        <span>{trait.label}: {traitValue.toFixed(2)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* 실시간 최종 결과 모니터링 */}
        <div className="final-results-monitor">
          <h3>실시간 3축 모델 결과</h3>
          
          {/* 축 1: 정신의 권력 구조 */}
          <div className="axis-preview-section">
            <h4>축 1: 정신의 권력 구조</h4>
            <div className="axis-preview-grid">
              <div className="axis-preview-item">
                <span className="result-label">원초아 (Id)</span>
                <span className="result-value">{state.finalResults.id.toFixed(2)}</span>
              </div>
              <div className="axis-preview-item">
                <span className="result-label">자아 (Ego)</span>
                <span className="result-value">{state.finalResults.ego.toFixed(2)}</span>
              </div>
              <div className="axis-preview-item">
                <span className="result-label">초자아 (Superego)</span>
                <span className="result-value">{state.finalResults.superego.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 축 2: 세상과의 관계 맺기 */}
          <div className="axis-preview-section">
            <h4>축 2: 세상과의 관계 맺기</h4>
            <div className="axis-preview-grid">
              <div className="axis-preview-item">
                <span className="result-label">구강기적 (Oral)</span>
                <span className="result-value">{state.finalResults.oral.toFixed(2)}</span>
              </div>
              <div className="axis-preview-item">
                <span className="result-label">항문기적 (Anal)</span>
                <span className="result-value">{state.finalResults.anal.toFixed(2)}</span>
              </div>
              <div className="axis-preview-item">
                <span className="result-label">남근기적 (Phallic)</span>
                <span className="result-value">{state.finalResults.phallic.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 축 3: 존재의 질서 */}
          <div className="axis-preview-section">
            <h4>축 3: 존재의 질서</h4>
            <div className="axis-preview-grid">
              <div className="axis-preview-item">
                <span className="result-label">질서 (Order)</span>
                <span className="result-value">{state.finalResults.order.toFixed(2)}</span>
              </div>
              <div className="axis-preview-item">
                <span className="result-label">균형 (Balance)</span>
                <span className="result-value">{state.finalResults.balance.toFixed(2)}</span>
              </div>
              <div className="axis-preview-item">
                <span className="result-label">혼돈 (Chaos)</span>
                <span className="result-value">{state.finalResults.chaos.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
