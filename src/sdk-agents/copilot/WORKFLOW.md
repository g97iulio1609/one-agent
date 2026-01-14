# Copilot Workflow

Orchestrates user requests by detecting domain and routing to specialized agents.

## 1. Detect Domain

```yaml
call: workers/domain-detector
input:
  query: ${input.query}
  context: ${input.context}
  conversationHistory: ${input.conversationHistory}
store: domainResult
```

## 2. Route to Domain Agent

```yaml
switch: ${artifacts.domainResult.domain}
cases:
  nutrition:
    call: @onecoach/lib-nutrition:sdk-agents/nutrition-generation
    input:
      userId: ${input.userId}
      query: ${input.query}
      context: ${input.context}
    store: domainResponse
    
  workout:
    call: @onecoach/one-workout:sdk-agents/workout-generation
    input:
      userId: ${input.userId}
      query: ${input.query}
      context: ${input.context}
    store: domainResponse
    
  flight:
    call: @onecoach/lib-flight:sdk-agents/flight-search
    input:
      userId: ${input.userId}
      query: ${input.query}
    store: domainResponse
    
  oneagenda:
    call: @onecoach/oneagenda-core:sdk-agents/agenda-planner
    input:
      userId: ${input.userId}
      query: ${input.query}
    store: domainResponse
    
  default:
    call: workers/general-chat
    input:
      query: ${input.query}
      userId: ${input.userId}
    store: domainResponse
```

## 3. Synthesize Response

```yaml
transform: synthesizeResponse
input:
  domainResult: ${artifacts.domainResult}
  domainResponse: ${artifacts.domainResponse}
  originalQuery: ${input.query}
store: finalResponse
```
