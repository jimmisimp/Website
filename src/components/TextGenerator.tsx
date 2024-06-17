import React, { useState, useRef } from 'react';
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.REACT_APP_OPENAIKEY, dangerouslyAllowBrowser: true });

function getLuminance(hexColor) {
    const rgb = parseInt(hexColor.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >>  8) & 0xff;
    const b = (rgb >>  0) & 0xff;
    
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma;
}

function getTextColor(backgroundColor) {
    const luma = getLuminance(backgroundColor);
    return luma < 140 ? '#d9d9d9' : '#171717';
}

async function generateText(setText, setButtonVisible, setFormVisible, inputRef) {
    const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.75,
        messages: [{ role: "user", content: "Write another sentence like this one `is creating ai-powered experiences.`. Keep it between 16 - 24 words, and try to avoid too many adjectives. Never imply that I'm a developer. Your output MUST start with `is` (lowercase) and be about the subject, Adam Yuras, a Senior UX and product design specialist from Philadelphia PA. He works at Comcast. It should describe what else he does. More about him from his profile: Designing, prototyping, and testing tools for customer-facing agents in the chat and voice space, for technicians, and retail associates with a focus on AI-enabled features. I'm a hands-on designer who prefers to explore solutions by developing prototypes in code. I'm a designer who thinks like a developer. I've helped develop the skills of those I work with. I'm a strong researcher, but I'm also business minded and know how to keep things moving and when we're wasting our time." }],
        stream: true,
    });
    
    setButtonVisible(false);
    
    let text = '';
    for await (const chunk of stream) {
        text += chunk.choices[0]?.delta?.content || "";
        setText(text);
        setFormVisible(true);
    }

    inputRef.current.focus();
}

async function generateColor(e, setColorData, setColorName, setColorCost, setFormVisible) {
    e.preventDefault();
    const input:string = e.target.elements.colorInput.value;
    if (input.length > 0) {
        setFormVisible(false);

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: `Generate an aesthetic color palette from five hex color values using the following description: ${input}. Output only these 3 hex values, a descriptive name for the palette, and a 'cost' for your services, to be paid in items related to the initial description, along with its equivalent cash value (this can be realistic or comical, all text should be lowercase) in JSON, in this format: {"colors": ["#FF0000","#00FF00","#0000FF, #00FFFF, #FFFF00"], "name": "pixel", "cost": "that will be 10,000 pixels ($0.01), thank you."}` }],
                response_format: { type: "json_object" }
            });

            const response = completion.choices[0].message.content || '';
            console.log(response)
            const colors = JSON.parse(response).colors;
            const name = JSON.parse(response).name;
            const cost = JSON.parse(response).cost;
            setColorData(colors);
            setColorName(name);
            setColorCost(cost);
        } catch (error) {
            console.error('Error generating colors:', error);
        }
}}

export const TextGenerator: React.FC = () => {
    const [text, setText] = useState('is creating ai-powered experiences.');
    const [colorData, setColorData] = useState<string[]>([]);
    const [colorName, setColorName] = useState('Name');
    const [colorCost, setColorCost] = useState('Cost');
    const [buttonVisible, setButtonVisible] = useState(true)
    const [formVisible, setFormVisible] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div>
            <div className='generated-text'>
                {text}
            </div>
            {buttonVisible ? 
                <button className="main-button pulse" onClick={() => generateText(setText, setButtonVisible, setFormVisible, inputRef)}>What else?
                    <div className='pulse'/>
                </button>
             :
            formVisible ? (
            <form onSubmit={(e) => generateColor(e, setColorData, setColorName, setColorCost, setFormVisible)} className='color-area'>
                Let's create something colorful, with the power of ai:
                <div className='input-group'>
                    <input maxLength={64} name='colorInput' placeholder='Enter anything' className='color-input' ref={inputRef}/>
                    <button type="submit" className="main-button">Create</button>
                </div>
            </form>
            ) : <div className="color-cost">Generating some color...</div>}
            {colorData.length > 0 && (
                <div className='color-results'>
                    <div className='color-name'>{colorName}</div>
                    {colorData.map((color, index) => (
                        <div key={index} style={{ backgroundColor: color, padding: '12px', color: getTextColor(color) }}>
                            {color}
                        </div>
                    ))}
                    <p className='color-cost'>{colorCost}</p>
                    <div className='link'>Connect on <a style={{backgroundColor: getTextColor(`${colorData[0]}`), color:`${colorData[0]}`}} href='https://www.linkedin.com/in/adam-yuras-ux/'>LinkedIn</a></div>
                </div>
            )}
        </div>
    );
};
