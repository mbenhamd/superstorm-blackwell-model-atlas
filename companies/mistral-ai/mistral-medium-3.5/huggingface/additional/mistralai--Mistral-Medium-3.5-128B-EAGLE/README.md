---
license: other
language:
- en
- fr
- de
- es
- pt
- it
- ja
- ko
- ru
- zh
- ar
- fa
- id
- ms
- ne
- pl
- ro
- sr
- sv
- tr
- uk
- vi
- hi
- bn
tags:
- vLLM
- EAGLE
base_model:
- mistralai/Mistral-Medium-3.5-128B
---

# Mistral Medium 3.5 128B EAGLE

> [!Note]
> This is the Eagle model of the Mistral Medium 3.5 model to perform speculative decoding. Click [here](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B) to access the
> `mistralai/Mistral-Medium-3.5-128B` weights.

Mistral Medium 3.5 is our first flagship merged model. It is a dense 128B model with a 256k context window, handling instruction-following, reasoning,
and coding in a single set of weights. Mistral Medium 3.5 replaces its predecessor Mistral Medium 3.1 and Magistral in Le Chat. It also replaces Devstral 2 in our
coding agent Vibe. Concretely, expect better performance for instruct, reasoning and coding tasks in a new unified model in comparison with our previous released models.

Reasoning effort is configurable per request, so the same model can answer a quick chat reply or work through a complex agentic run. We trained the vision encoder from
scratch to handle variable image sizes and aspect ratios.

Find more information on our [blog](https://mistral.ai/news/vibe-remote-agents-mistral-medium-3-5).

## Key Features

Mistral Medium 3.5 includes the following architectural choices:

- **Dense 128B parameters**.
- **256k context length**.
- **Multimodal input**: Accepts both text and image input, with text output.
- **Instruct and Reasoning functionalities** with function calls (reasoning effort configurable per request).

Mistral Medium 3.5 offers the following capabilities:

- **Reasoning Mode**: Toggle between fast instant reply mode and reasoning mode, boosting performance with test-time compute when requested.
- **Vision**: Analyzes images and provides insights based on visual content, in addition to text.
- **Multilingual**: Supports dozens of languages, including English, French, Spanish, German, Italian, Portuguese, Dutch, Chinese, Japanese, Korean, and Arabic.
- **System Prompt**: Strong adherence and support for system prompts.
- **Agentic**: Best-in-class agentic capabilities with native function calling and JSON output.
- **Large Context Window**: Supports a 256k context window.

We release this model under a **[Modified MIT License]((https://huggingface.co/mistralai/mistralai/Mistral-Medium-3.5-128B/blob/main/LICENSE))**: Open-source license for both commercial and non-commercial use with exceptions for companies with large revenue.

## Recommended Settings

- **Reasoning Effort**:
  - `'none'` → Do not use reasoning
  - `'high'` → Use reasoning (recommended for complex prompts and agentic usage)
  Use `reasoning_effort="high"` for complex tasks and agentic coding.
- **Temperature**: 0.7 for `reasoning_effort="high"`. Temp between 0.0 and 0.7 for `reasoning_effort="none"` depending on the task.
  Generally, lower means answer that are more to the point and higher allows the model to be more creative. It is a good practice to try different values in order to
  improve the model performance to meet your demands. 


## Usage

To use Mistral Medium 3.5 EAGLE, we describe the setup with the [vLLM library](https://github.com/vllm-project/vllm) for production-ready inference.

You can also use the EAGLE head via [`SGLang`](https://github.com/sgl-project/sglang): See [here](#sglang).


### Installation

Make sure to install **vllm nightly**:

```
uv pip install -U vllm \
   --torch-backend=auto \
   --extra-index-url https://wheels.vllm.ai/nightly
```

Doing so should automatically install [`mistral_common >= 1.11.1`](https://github.com/mistralai/mistral-common/releases/tag/v1.11.1) and `transformers >= 5.4.0`.
  
To check:
```
python -c "import mistral_common; print(mistral_common.__version__)"
python -c "import transformers; print(transformers.__version__)"
```
  
You can also make use of a ready-to-go [docker image](https://github.com/vllm-project/vllm/blob/main/docker/Dockerfile) or on the [docker hub](https://hub.docker.com/layers/vllm/vllm-openai/nightly).

### Serve the Model

We recommend a server/client setup:

```bash
vllm serve mistralai/Mistral-Medium-3.5-128B --tensor-parallel-size 8 \
  --tool-call-parser mistral --enable-auto-tool-choice --reasoning-parser mistral --max_num_batched_tokens 16384 --max_num_seqs 128 \
  --gpu_memory_utilization 0.8 --speculative_config '{
    "model": "mistralai/Mistral-Medium-3.5-128B-EAGLE",
    "num_speculative_tokens": 3,
    "method": "eagle",
    "max_model_len": "65536"
  }'
```

### SGLang

Day-zero support ships in dedicated docker tags:

```
docker pull lmsysorg/sglang:dev-mistral-medium-3.5         # H100 / H200 (Hopper, CUDA 12.9)
docker pull lmsysorg/sglang:dev-cu13-mistral-medium-3.5    # B200 / B300 (Blackwell, CUDA 13.0)
```

Or follow the [SGLang installation guide](https://docs.sglang.io/docs/get-started/install). Requires `transformers >= 5.4.0`.

Serve the target model with the EAGLE draft enabled:

```bash
python -m sglang.launch_server --model-path mistralai/Mistral-Medium-3.5-128B \
  --tp 8 --dtype bfloat16 --tool-call-parser mistral --reasoning-parser mistral \
  --speculative-algorithm EAGLE \
  --speculative-draft-model-path mistralai/Mistral-Medium-3.5-128B-EAGLE \
  --speculative-num-steps 3 --speculative-eagle-topk 1 --speculative-num-draft-tokens 4
```

For the full deployment guide and benchmarks, see the [SGLang cookbook entry for Mistral Medium 3.5](https://docs.sglang.io/cookbook/autoregressive/Mistral/Mistral-Medium-3.5).

### Ping the Server

<details>
  <summary>Instruction Following</summary>

Mistral Medium 3.5 can follow your instructions to the letter.


```python
from datetime import datetime, timedelta

from openai import OpenAI
from huggingface_hub import hf_hub_download

# Modify OpenAI's API key and API base to use vLLM's API server.
openai_api_key = "EMPTY"
openai_api_base = "http://localhost:8000/v1"

TEMP = 0.1
# use TEMP = 0.7 for reasoning="high"

client = OpenAI(
    api_key=openai_api_key,
    base_url=openai_api_base,
)

models = client.models.list()
model = models.data[0].id


def load_system_prompt(repo_id: str, filename: str) -> str:
    file_path = hf_hub_download(repo_id=repo_id, filename=filename)
    with open(file_path, "r") as file:
        system_prompt = file.read()
    today = datetime.today().strftime("%Y-%m-%d")
    yesterday = (datetime.today() - timedelta(days=1)).strftime("%Y-%m-%d")
    model_name = repo_id.split("/")[-1]
    return system_prompt.format(name=model_name, today=today, yesterday=yesterday)


SYSTEM_PROMPT = load_system_prompt(model, "SYSTEM_PROMPT.txt")

messages = [
    {"role": "system", "content": SYSTEM_PROMPT},
    {
        "role": "user",
        "content": "Write me a sentence where every word starts with the next letter in the alphabet - start with 'a' and end with 'z'.",
    },
]

response = client.chat.completions.create(
    model=model,
    messages=messages,
    temperature=TEMP,
    reasoning_effort="none",
)

assistant_message = response.choices[0].message.content
print(assistant_message)
```

</details>

<details>
  <summary>Tool Call</summary>

Let's solve some equations thanks to our simple Python calculator tool.


```python
import json
from datetime import datetime, timedelta

from openai import OpenAI
from huggingface_hub import hf_hub_download

# Modify OpenAI's API key and API base to use vLLM's API server.
openai_api_key = "EMPTY"
openai_api_base = "http://localhost:8000/v1"

TEMP = 0.1

client = OpenAI(
    api_key=openai_api_key,
    base_url=openai_api_base,
)

models = client.models.list()
model = models.data[0].id


def load_system_prompt(repo_id: str, filename: str) -> str:
    file_path = hf_hub_download(repo_id=repo_id, filename=filename)
    with open(file_path, "r") as file:
        system_prompt = file.read()
    today = datetime.today().strftime("%Y-%m-%d")
    yesterday = (datetime.today() - timedelta(days=1)).strftime("%Y-%m-%d")
    model_name = repo_id.split("/")[-1]
    return system_prompt.format(name=model_name, today=today, yesterday=yesterday)


SYSTEM_PROMPT = load_system_prompt(model, "SYSTEM_PROMPT.txt")

image_url = "https://math-coaching.com/img/fiche/46/expressions-mathematiques.jpg"


def my_calculator(expression: str) -> str:
    return str(eval(expression))


tools = [
    {
        "type": "function",
        "function": {
            "name": "my_calculator",
            "description": "A calculator that can evaluate a mathematical expression.",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "The mathematical expression to evaluate.",
                    },
                },
                "required": ["expression"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "rewrite",
            "description": "Rewrite a given text for improved clarity",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "The input text to rewrite",
                    }
                },
            },
        },
    },
]

messages = [
    {"role": "system", "content": SYSTEM_PROMPT},
    {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": "Thanks to your calculator, compute the results for the equations that involve numbers displayed in the image.",
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": image_url,
                },
            },
        ],
    },
]

response = client.chat.completions.create(
    model=model,
    messages=messages,
    temperature=TEMP,
    tools=tools,
    tool_choice="auto",
    reasoning_effort="none",
)

tool_calls = response.choices[0].message.tool_calls

results = []
for tool_call in tool_calls:
    function_name = tool_call.function.name
    function_args = tool_call.function.arguments
    if function_name == "my_calculator":
        result = my_calculator(**json.loads(function_args))
        results.append(result)

messages.append({"role": "assistant", "tool_calls": tool_calls})
for tool_call, result in zip(tool_calls, results):
    messages.append(
        {
            "role": "tool",
            "tool_call_id": tool_call.id,
            "name": tool_call.function.name,
            "content": result,
        }
    )


response = client.chat.completions.create(
    model=model,
    messages=messages,
    temperature=TEMP,
    reasoning_effort="none",
)

print(response.choices[0].message.content)
```

</details>

<details>
  <summary>Vision Reasoning</summary>

Let's see if the Mistral Medium 3.5 knows when to pick a fight !

```python
from datetime import datetime, timedelta

from openai import OpenAI
from huggingface_hub import hf_hub_download

# Modify OpenAI's API key and API base to use vLLM's API server.
openai_api_key = "EMPTY"
openai_api_base = "http://localhost:8000/v1"

TEMP = 0.7

client = OpenAI(
    api_key=openai_api_key,
    base_url=openai_api_base,
)

models = client.models.list()
model = models.data[0].id


def load_system_prompt(repo_id: str, filename: str) -> str:
    file_path = hf_hub_download(repo_id=repo_id, filename=filename)
    with open(file_path, "r") as file:
        system_prompt = file.read()
    today = datetime.today().strftime("%Y-%m-%d")
    yesterday = (datetime.today() - timedelta(days=1)).strftime("%Y-%m-%d")
    model_name = repo_id.split("/")[-1]
    return system_prompt.format(name=model_name, today=today, yesterday=yesterday)


SYSTEM_PROMPT = load_system_prompt(model, "SYSTEM_PROMPT.txt")
image_url = "https://static.wikia.nocookie.net/essentialsdocs/images/7/70/Battle.png/revision/latest?cb=20220523172438"

messages = [
    {"role": "system", "content": SYSTEM_PROMPT},
    {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": "What action do you think I should take in this situation? List all the possible actions and explain why you think they are good or bad.",
            },
            {"type": "image_url", "image_url": {"url": image_url}},
        ],
    },
]


response = client.chat.completions.create(
    model=model,
    messages=messages,
    temperature=TEMP,
    reasoning_effort="high",
)

print(response.choices[0].message.content)
```

</details>


## License

This model is licensed under a [Modified MIT License](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B-EAGLE/blob/main/LICENSE).

*You must not use this model in a manner that infringes, misappropriates, or otherwise violates any third party’s rights, including intellectual property rights.*