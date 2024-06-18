import React, { useState, useRef } from 'react';
import OpenAI from "openai";
import { ChatAvatar } from "./ChatAvatar.tsx"

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
    return luma < 140 ? '#ffffff' : '#171717';
}

async function generateText(setText, setButtonVisible, setFormVisible, scrollRef) {
    const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.75,
        messages: [{ role: "user", content: "Write a sentence. Keep it under 48 words, and try to avoid too many adjectives. Give it a slightly sardonic humor. Never imply that I'm a developer. Your output MUST start with `hello there! i'm adamatic. I'd be happy to tell you more about adam yuras.`, be in all lowercase, and be about the subject, Adam Yuras, a Senior UX and product design specialist from Philadelphia PA. He works at Comcast. It should describe a bit about who he is and what he does. More about him from his profile: Designing, prototyping, and testing tools for customer-facing agents in the chat and voice space, for technicians, and retail associates with a focus on AI-enabled features. I'm a hands-on designer who prefers to explore solutions by developing prototypes in code. I'm a designer who thinks like a developer. I've helped develop the skills of those I work with. I'm a strong researcher, but I'm also business minded and know how to keep things moving and when we're wasting our time." }],
        stream: true,
    });
    
    setButtonVisible(false);
    
    let text = '';
    for await (const chunk of stream) {
        text += chunk.choices[0]?.delta?.content || "";
        setText(text);
    }
    
    setTimeout(()=> {setFormVisible(true)}, 500)
    setTimeout(()=> {scrollRef.current.scrollIntoView({behavior: 'smooth'})}, 100)
}

async function generateColor(e, setColorData, setColorName, setColorCost, setFormVisible, setGeneratingVisible, scrollRef) {
    e.preventDefault();
    const input:string = e.target.elements.colorInput.value;
    if (input.length > 0) {
        setFormVisible(false);
        setGeneratingVisible(true);

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: `Generate a cohesive color palette from five hex color values using the following as inspiration: ${input}. Output only five hex values, a descriptive name for the palette, and a 'cost' for your services, to be paid in items related to the initial description, along with its equivalent cash value (this can be realistic or comical, all text should be lowercase) in JSON, in this format: {"colors": ["#FF0000","#00FF00","#0000FF, #00FFFF, #FFFF00"], "name": "pixel", "cost": "that will be 10,000 pixels ($0.01), thank you."}` }],
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
            setTimeout(()=> {scrollRef.current.scrollIntoView({behavior: 'smooth'})}, 100)
        } catch (error) {
            console.error('Error generating colors:', error);
        }    
    }
    
} 

export const TextGenerator: React.FC = () => {
    const [text, setText] = useState('');

    const [colorData, setColorData] = useState<string[]>([]);
    const [colorName, setColorName] = useState('Name');
    const [colorCost, setColorCost] = useState('Cost');
    const [buttonVisible, setButtonVisible] = useState(true)
    const [formVisible, setFormVisible] = useState(false);
    const [generatingVisible, setGeneratingVisible] = useState(false);

    const scrollRef = useRef<HTMLInputElement>(null);

    return (
        <div>
            <div className='subheader'>
                is creating ai-powered experiences.
            </div>
            {text.length > 0 &&
            <>
            <ChatAvatar/>
            <div className='content-block'>
                <div className='generated-text'>{text}</div>
            </div>
            </>
            }
            {buttonVisible &&
                <button className="main-button pulse" onClick={() => generateText(setText, setButtonVisible, setFormVisible, scrollRef)}>What else?
                    <div className='pulse'/>
                </button>
            }
            {formVisible && 
            <>
            <ChatAvatar/>
            <form onSubmit={(e) => generateColor(e, setColorData, setColorName, setColorCost, setFormVisible, setGeneratingVisible, scrollRef)} className='content-block'>
                <div className='generated-text'>let's have some fun. think of something, anything, and i'll make a color palette from it.</div>
                <div className='input-group'>
                    <input maxLength={64} name='colorInput' placeholder='Enter an object, a phrase, whatever' className='color-input'/>
                    <button type="submit" className="main-button">Create</button>
                </div>
            </form>
            </>
            }
            {generatingVisible &&
            <>
            <ChatAvatar/>
            <div className='content-block'>
                <div className='generated-text'>generating a color palette...</div>
            </div>
            </>
            }
            {colorData.length > 0 && (
                <>
                <ChatAvatar/>
                <div className='content-block'>
                    <div className='generated-text'>i call this: "{colorName}"</div>
                    <div className='color-results'>
                    {colorData.map((color, index) => (
                        <div key={index} style={{ backgroundColor: color, padding: '12px', color: getTextColor(color) }}>
                            {color}
                        </div>
                    ))}
                    </div>
                    <div className='generated-text'>{colorCost}</div>
                </div>
                <div className='link'>Connect on <a style={{backgroundColor: getTextColor(`${colorData[0]}`), color:`${colorData[0]}`}} href='https://www.linkedin.com/in/adam-yuras-ux/'>LinkedIn</a></div>
                </>
            )}
            <div ref={scrollRef}/>
        </div>
    );
};
