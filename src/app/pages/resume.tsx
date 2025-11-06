import React, { useCallback } from 'react';

type Experience = {
    company: string;
    role: string;
    period: string;
    location: string;
    bullets: string[];
    skills?: string;
};

export const experiences: Experience[] = [
    {
        company: 'Comcast',
        role: 'Product Engineer and Designer, AI',
        period: 'Apr 2025 – Present',
        location: 'Philadelphia, Pennsylvania',
        bullets: [
            'Lead exploration, evaluation, and adoption of emerging AI tools and platforms, serving as the go-to resource for identifying and validating AI-driven solutions.',
            'Develop AI agents, evaluations, and testing frameworks in Python, TypeScript, and YAML, with agents built using Mastra and Google Agent Development Kit (ADK) frameworks.',
            'Design interactive prototypes to illustrate both the potential and limitations of AI integration within Comcast’s customer service ecosystem.',
        ],
    },
    {
        company: 'Comcast',
        role: 'Design Specialist',
        period: 'Feb 2024 – Apr 2025',
        location: 'Philadelphia, Pennsylvania',
        bullets: [
            'Designed, prototyped, and tested tools for customer-facing agents, field technicians, and support associates.',
            'Integrated AI-enabled features that improved operational efficiency and customer outcomes across service teams.',
            'Created proofs-of-concept well before AI was a buzzword, and helped shape the direction of the product team.',
            'Partnered with cross-functional leaders to validate solutions and prioritize enhancements for internal platform experiences.',
        ],
    },
    {
        company: 'Think Company',
        role: 'Senior Experience Designer',
        period: 'Nov 2021 – Feb 2024',
        location: 'Philadelphia, Pennsylvania',
        bullets: [
            'Spearheaded AI chat and voice application design for Comcast, elevating customer service operations and agent tooling.',
            'Led the creation of a NLP-based voice product that unified agent workflows and surfaced intelligent recommendations.',
            'Transitioned the product team from Sketch to Figma, revamped the agent chat platform with ADA-focused improvements, and guided research to inform roadmap decisions.',
        ],
    },
    {
        company: 'Giant Eagle, Inc.',
        role: 'User Experience Designer',
        period: 'Feb 2018 – Nov 2021',
        location: 'Pittsburgh, Pennsylvania',
        bullets: [
            'Helped transform the UX discipline into a customer experience organization by shaping processes, playbooks, and cross-team rituals.',
            'Delivered major programs including Fuelperks+ loyalty and Scan Pay & Go, blending customer-facing and internal software design.',
            'Standardized design systems across digital platforms and embedded accessibility best practices into research and delivery.',
        ],
    },
];

export const topSkills = [
    'I take pride in my work, whether it\'s design or code. When there\'s nothing assigned, I will make enhancements to the repo. I strive to be the most impactful member of the team, and I\'ve been told as much by my peers.',
];

export const Resume: React.FC = () => {
    const handleSavePdf = useCallback(() => {
        window.print();
    }, []);

    return (
        <div className="resume">
            <header className="resume__header">
                <div className="name resume__name">adam yuras</div>
                <p className="resume__title">Product Designer and Developer for AI Tools at Comcast</p>
                <div className="resume__lead">
                    AI-focused product designer, engineer, and UX leader building and prototyping next-gen customer service tools at Comcast.
                </div>
                <div className="resume__actions">
                    <button type="button" className="main-button small" onClick={handleSavePdf}>
                        Save as PDF
                    </button>
                    <button
                        type="button"
                        className="main-button small resume__link"
                        onClick={() => window.open('https://www.linkedin.com/in/adam-yuras-ai', '_blank')}
                    >
                        View LinkedIn
                    </button>
                </div>
            </header>
            <section className="resume__experience">
                <h2>Who I am</h2>
                <div className="resume__experience-list">
                    <article className="resume__experience-item">
                        <span>{topSkills}</span>
                    </article>
                </div>
                <div className="resume__experience-list">
                    <article className="resume__experience-item">
                        <span><h4>Code</h4>Python, TypeScript, JavaScript, React, Vue, Node.js</span>
                        <span><h4>AI</h4>Google ADK, Google Cloud, Vertex AI, Mastra, OpenAI APIs</span>
                        <span><h4>Design</h4>Figma, Figjam, UserTesting</span>
                    </article>
                </div>
            </section>
            <section className="resume__experience">
                <h2>Experience</h2>
                <div className="resume__experience-list">
                    {experiences.map(experience => (
                        <article key={`${experience.company}-${experience.role}`} className="resume__experience-item">
                            <header>
                                <h3>{experience.role}</h3>
                                <div className="resume__experience-meta">
                                    <span>{experience.company}</span>
                                    <span>{experience.period}</span>
                                    <span>{experience.location}</span>
                                </div>
                            </header>
                            <ul>
                                {experience.bullets.map(bullet => (
                                    <li key={bullet}>{bullet}</li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
};

