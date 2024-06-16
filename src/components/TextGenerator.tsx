import React, {useState} from 'react';
import OpenAI from "openai";

const openai = new OpenAI({apiKey: process.env.REACT_APP_OPENAIKEY, dangerouslyAllowBrowser: true});

async function generateText(setText) {
    const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Write a another sentence like this one `is creating ai-powered experiences.`. Your output MUST start with `is` (lowercase) and be about the subject, Adam Yuras, a UX and product design specialist. It should describe what else he does." }],
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
			<div>
                {text}
            </div>
			<button className="main-button" onClick={()=> generateText(setText)}>What else?</button>
		</div>
    )
}