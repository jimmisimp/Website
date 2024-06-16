import React, {useState} from 'react';
import OpenAI from "openai";

const openai = new OpenAI({apiKey: process.env.REACT_APP_OPENAIKEY, dangerouslyAllowBrowser: true});

async function generateText(setText) {
    const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 1.1,
        messages: [{ role: "user", content: "Write a another sentence like this one `is creating ai-powered experiences.`. Max of 12 words, try to keep it focused on a single skill, and try to avoid too many adjectives. Never imply that I'm a developer. Your output MUST start with `is` (lowercase) and be about the subject, Adam Yuras, a Senior UX and product design specialist from Philadelphia PA. He works at Comcast. It should describe what else he does. More about him from his profile: Designing, prototyping, and testing tools for customer-facing agents in the chat and voice space, for technicians, and retail associates with a focus on AI-enabled features. I'm a hands-on designer who prefers to explore solutions by developing prototypes in code. I'm a designer who thinks like a developer. I've helped develop the skills of those I work with. I'm a strong researcher, but I'm also business minded and know how to keep things moving and when we're wasting our time." }],
        stream: true,
    });

    let text = '';
    for await (const chunk of stream) {
        text += chunk.choices[0]?.delta?.content || "";
        setText(text);
    }
}

export const TextGenerator:React.FC = () => {
	const [text, setText] = useState('is creating ai-powered experiences.');

    return (
        <div>
			<div className='generated-text'>
                {text}
            </div>
			<button className="main-button pulse" onClick={()=> generateText(setText)}>What else?
                <div className='pulse'/>
            </button>
		</div>
    )
}