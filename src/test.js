// 특성 재계산 함수
function recalculateTraits(ctx) {
  const state = ctx.state.personalityTest
  const answers = state.answers
  const questions = state.questions
  const latentTraitsData = state.latentTraitsData
  
  // latentTraitsData가 로드되지 않았으면 함수 종료
  if (!latentTraitsData || Object.keys(latentTraitsData).length === 0) {
    return
  }
  
  // 잠재 특성 계산 - JSON에서 동적으로 생성
  const latentTraits = {}
  
  // 모든 잠재특성 초기화
  Object.keys(latentTraitsData).forEach(categoryKey => {
    const category = latentTraitsData[categoryKey]
    Object.keys(category.traits).forEach(traitKey => {
      latentTraits[traitKey] = 0
    })
  })
  
  // 각 답변에 대한 가중치 적용
  answers.forEach((choiceIndex, questionIndex) => {
    if (choiceIndex !== undefined && choiceIndex >= 0 && questions[questionIndex]) {
      const question = questions[questionIndex]
      const choice = question.choices[choiceIndex]
      
      // 잠재 특성에 가중치 적용
      Object.keys(choice.latentWeights).forEach(trait => {
        if (latentTraits.hasOwnProperty(trait)) {
          latentTraits[trait] += choice.latentWeights[trait]
        }
      })
    }
  })

  Object.keys(latentTraits).forEach(trait => {
    latentTraits[trait] /= answers.length
  })
  
  // tanh 함수 적용하여 -1~1 범위로 제한
  Object.keys(latentTraits).forEach(trait => {
    state.latentTraits[trait] = Math.tanh(latentTraits[trait])
  })
  
  // 최종 결과 계산 (3축 모델: 9개 파라미터)
  const finalResults = {
    // 축 1: 정신의 권력 구조
    id: 0,      // 원초아 (Id)
    ego: 0,     // 자아 (Ego)
    superego: 0, // 초자아 (Superego)
    
    // 축 2: 세상과의 관계 맺기
    oral: 0,    // 구강기적 (Oral)
    anal: 0,    // 항문기적 (Anal)
    phallic: 0, // 남근기적 (Phallic)
    
    // 축 3: 존재의 질서
    order: 0,   // 질서 (Order)
    balance: 0, // 균형 (Balance)
    chaos: 0    // 혼돈 (Chaos)
  }
  
  // latent.json에서 finalWeights를 가져와서 계산
  Object.keys(state.latentTraits).forEach(trait => {
    // 모든 카테고리에서 해당 trait을 찾아서 finalWeights 사용
    let traitFinalWeights = null
    Object.keys(latentTraitsData).forEach(categoryKey => {
      const category = latentTraitsData[categoryKey]
      if (category.traits && category.traits[trait] && category.traits[trait].finalWeights) {
        traitFinalWeights = category.traits[trait].finalWeights
      }
    })
    
    if (traitFinalWeights) {
      // 9개 파라미터 모두에 가중치 적용
      Object.keys(finalResults).forEach(result => {
        finalResults[result] += state.latentTraits[trait] * traitFinalWeights[result]
      })
    }
  })

  // Normalize by count of traits
  Object.keys(finalResults).forEach(result => {
    finalResults[result] /= Object.keys(latentTraitsData).length
  })
  
  // 최종 결과에도 tanh 적용
  Object.keys(finalResults).forEach(result => {
    state.finalResults[result] = Math.tanh(finalResults[result])
  })
}

// 성격유형검사 모듈
export function createPersonalityTest() {
  return {
    id: 'personalityTest',
    
    init(ctx) {
      // 초기 상태 설정
      ctx.state.personalityTest ??= {
        currentQuestionIndex: 0,
        answers: [],
        questions: [],
        latentTraitsData: {},
        latentTraits: {},
        finalResults: {
          // 축 1: 정신의 권력 구조
          id: 0,      // 원초아 (Id)
          ego: 0,     // 자아 (Ego)
          superego: 0, // 초자아 (Superego)
          
          // 축 2: 세상과의 관계 맺기
          oral: 0,    // 구강기적 (Oral)
          anal: 0,    // 항문기적 (Anal)
          phallic: 0, // 남근기적 (Phallic)
          
          // 축 3: 존재의 질서
          order: 0,   // 질서 (Order)
          balance: 0, // 균형 (Balance)
          chaos: 0    // 혼돈 (Chaos)
        }
      }
    },

    actions: {
      // 문항 시작
      startTest(payload, ctx) {
        ctx.state.personalityTest.currentQuestionIndex = 0
        ctx.state.personalityTest.answers = []
        recalculateTraits(ctx)
        
        return [
          { type: 'log', msg: '성격유형검사를 시작합니다.' }
        ]
      },

      // 문항 데이터 로드
      loadQuestions(payload, ctx) {
        const { questions } = payload
        ctx.state.personalityTest.questions = questions
        
        return [
          { type: 'log', msg: '문항 데이터를 로드했습니다.' }
        ]
      },

      // 잠재특성 데이터 로드
      loadLatentTraits(payload, ctx) {
        const { latentTraitsData } = payload
        
        // latentTraitsData가 유효한지 확인
        if (!latentTraitsData || typeof latentTraitsData !== 'object') {
          return [
            { type: 'log', msg: '잠재특성 데이터가 유효하지 않습니다.' }
          ]
        }
        
        ctx.state.personalityTest.latentTraitsData = latentTraitsData
        
        // 잠재특성 초기화
        const latentTraits = {}
        Object.keys(latentTraitsData).forEach(categoryKey => {
          const category = latentTraitsData[categoryKey]
          if (category && category.traits) {
            Object.keys(category.traits).forEach(traitKey => {
              latentTraits[traitKey] = 0
            })
          }
        })
        ctx.state.personalityTest.latentTraits = latentTraits
        
        return [
          { type: 'log', msg: '잠재특성 데이터를 로드했습니다.' }
        ]
      },

      // 문항 선택
      chooseAnswer(payload, ctx) {
        const { questionIndex, choiceIndex } = payload
        const state = ctx.state.personalityTest
        
        // 답변 기록
        if (!state.answers[questionIndex]) {
          state.answers[questionIndex] = choiceIndex
        }
        
        // 다음 문항으로 이동
        if (questionIndex < state.questions.length - 1) {
          state.currentQuestionIndex = questionIndex + 1
        }
        
        // 특성 재계산
        recalculateTraits(ctx)
        
        return [
          { type: 'log', msg: `문항 ${questionIndex + 1} 답변 완료` }
        ]
      },

      // 이전 문항으로 돌아가기
      goToPrevious(payload, ctx) {
        const state = ctx.state.personalityTest
        if (state.currentQuestionIndex > 0) {
          state.currentQuestionIndex--
          recalculateTraits(ctx)
        }
        
        return [
          { type: 'log', msg: '이전 문항으로 이동' }
        ]
      },

      // 특정 문항으로 이동
      goToQuestion(payload, ctx) {
        const { questionIndex } = payload
        const state = ctx.state.personalityTest
        
        if (questionIndex >= 0 && questionIndex < state.questions.length) {
          state.currentQuestionIndex = questionIndex
          recalculateTraits(ctx)
        }
        
        return [
          { type: 'log', msg: `문항 ${questionIndex + 1}로 이동` }
        ]
      }
    },

    save(ctx) {
      const state = ctx.state.personalityTest
      return {
        v: 1,
        currentQuestionIndex: state.currentQuestionIndex,
        answers: state.answers,
        questions: state.questions,
        latentTraitsData: state.latentTraitsData,
        latentTraits: state.latentTraits,
        finalResults: state.finalResults
      }
    },

    load(data, ctx) {
      if (data && data.v === 1) {
        const state = ctx.state.personalityTest
        state.currentQuestionIndex = data.currentQuestionIndex || 0
        state.answers = data.answers || []
        state.questions = data.questions || []
        state.latentTraitsData = data.latentTraitsData || {}
        state.latentTraits = data.latentTraits || {}
        state.finalResults = data.finalResults || {}
      }
    }
  }
}
