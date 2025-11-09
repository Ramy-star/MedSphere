'use client';
import React from 'react';
import type { Lecture, MCQ, WrittenCase } from '@/lib/types';
import { cn } from '@/lib/utils';

// --- STYLES ---
const GlobalStyles = () => (
    <style>{`
        /* --- Keyframes for Animations --- */
        @keyframes accordion-down {
          from { height: 0; }
          to { height: var(--radix-accordion-content-height); }
        }
        @keyframes accordion-up {
          from { height: var(--radix-accordion-content-height); }
          to { height: 0; }
        }
        @keyframes staggerFadeIn {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* --- CSS Variables --- */
        :root {
            /* Fonts */
            --qa-font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            --header-font: 'Coiny', cursive;
            --section-title-font: 'Calistoga', serif;
            --question-header-font: var(--qa-font-family);
            --base-font: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;

            /* Light Theme Colors */
            --page-bg: #f5f7fa;
            --text-color: #333;
            --container-bg: white;
            --container-shadow: 0 4px 15px rgba(0,0,0,0.1);
            --header-text: #1f2937;
            --header-border: #e5e7eb;
            --tab-bg: white;
            --tab-border: #cbd5e1;
            --tab-text: #334155;
            --tab-hover-bg: #f8fafc;
            --tab-hover-border: #94a3b8;
            --tab-hover-text: #0f172a;
            --tab-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --tab-hover-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            --tab-active-border: #1d4ed8;
            --tab-active-bg: #2563eb;
            --tab-active-gradient: linear-gradient(to right, #3b82f6, #4f46e5);
            --section-title-bg-light: linear-gradient(135deg, #3b82f6, #1e40af);
            --question-bg: #f8fafc;
            --question-border: #3b82f6;
            --question-shadow: 0 1px 3px rgba(0,0,0,0.05);
            --question-header-text: #dc2626;
            --explanation-bg: #ecfdf5;
            --explanation-border: #10b981;
            --explanation-text: #374151;
            --explanation-strong-text: #111827;
            --written-expl-bg: #f0fdfa;
            --written-expl-border: #99f6e4;
            --written-expl-text: #374151;
            --written-expl-strong-text: #111827;
            --written-label-text: #0d9488;
            --mcq-option-bg: #ffffff;
            --mcq-option-border: #e5e7eb;
            --mcq-option-text: #333;
            --mcq-option-hover-bg: #f9fafb;
            --mcq-option-hover-border: #d1d5db;
            --show-answer-gradient: linear-gradient(135deg, #60a5fa, #3b82f6);
            --show-answer-hover-gradient: linear-gradient(135deg, #3b82f6, #2563eb);
            --show-answer-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
            --show-answer-hover-shadow: 0 3px 6px rgba(59, 130, 246, 0.3);
            --fade-bg: white;
        }

        /* --- Base screen styles --- */
        .quiz-active {
            font-family: var(--base-font);
            background-color: var(--page-bg);
            color: var(--text-color);
            font-size: 17px;
            transition: background-color 0.3s ease, color 0.3s ease;
        }
        .page-container {
            width: 100%;
            height: 100%;
            background-color: var(--container-bg);
            overflow-x: hidden;
            transition: background-color 0.3s ease, box-shadow 0.3s ease;
            padding: 30px;
        }
        @media (max-width: 768px) {
            .page-container {
                padding: 15px;
            }
        }
        .header {
            background: none;
            color: var(--header-text);
            border-radius: 0;
            padding: 25px 0;
            margin-bottom: 20px;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            border-bottom: 2px solid var(--header-border);
            transition: color 0.3s ease, border-color 0.3s ease;
            position: relative;
        }
        .header-img {
            height: 80px;
            width: 80px;
            object-fit: contain;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header h1 {
            font-family: var(--header-font);
            font-size: 3.5rem;
            margin-bottom: 0;
            color: var(--header-text);
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            position: relative;
            top: 5px;
            transition: color 0.3s ease;
        }

        /* --- Styles for Lecture Tabs --- */
        #lecture-tabs-wrapper {
            position: relative;
            padding: 0 10px;
            border-bottom: 2px solid var(--header-border);
            margin-bottom: 25px;
            padding-bottom: 15px;
            transition: border-color 0.3s ease;
        }
        #lecture-tabs {
            display: flex;
            flex-wrap: nowrap;
            justify-content: flex-start;
            gap: 12px;
            padding: 5px 2px;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            scroll-behavior: smooth;
        }
        #lecture-tabs::-webkit-scrollbar { display: none; }
        #lecture-tabs button.lecture-tab-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            white-space: nowrap;
            border-radius: 9999px;
            border-width: 1px;
            text-align: center;
            font-weight: 500;
            font-size: 0.875rem;
            padding: 0.5rem 1rem;
            box-shadow: var(--tab-shadow);
            transition: color 0.3s ease-out, background-color 0.3s ease-out, border-color 0.3s ease-out, box-shadow 0.3s ease-out, transform 0.3s ease-out, filter 0.3s ease-out, background 0.3s ease-out;
            transform: scale(1);
            background-color: var(--tab-bg);
            border-color: var(--tab-border);
            color: var(--tab-text);
            background-image: none;
        }
        @media (min-width: 768px) {
            #lecture-tabs button.lecture-tab-btn {
                font-size: 1rem;
                padding: 0.5rem 1.25rem;
            }
        }
        #lecture-tabs button.lecture-tab-btn:not(.active):hover {
            background-color: var(--tab-hover-bg);
            border-color: var(--tab-hover-border);
            color: var(--tab-hover-text);
            box-shadow: var(--tab-hover-shadow);
            transform: translateY(-2px);
        }
        #lecture-tabs button.lecture-tab-btn.active {
            background-image: var(--tab-active-gradient);
            background-color: var(--tab-active-bg);
            border-color: var(--tab-active-border);
            color: white;
            font-weight: 600;
            box-shadow: none;
            transform: scale(1);
        }
        #lecture-tabs button.lecture-tab-btn.active:hover {
            box-shadow: none;
            filter: brightness(1.1);
            transform: translateY(-2px);
        }
        #lecture-tabs button.lecture-tab-btn:active { transform: scale(0.98); }
        #lecture-tabs button.lecture-tab-btn:focus { outline: none; }

        /* --- Overflow Indicators (Gradient Fades) --- */
        #lecture-tabs-wrapper::before,
        #lecture-tabs-wrapper::after {
            content: '';
            position: absolute;
            top: 0;
            bottom: 15px;
            width: 50px;
            pointer-events: none;
            z-index: 2;
            opacity: 0;
            transition: opacity 0.3s ease-in-out, background 0.3s ease;
        }
        #lecture-tabs-wrapper::before {
            left: 0;
            background: linear-gradient(to right, var(--fade-bg) 40%, rgba(255,255,255,0));
        }
        #lecture-tabs-wrapper::after {
            right: 0;
            background: linear-gradient(to left, var(--fade-bg) 40%, rgba(255,255,255,0));
        }
        #lecture-tabs-wrapper.show-fade-left::before { opacity: 1; }
        #lecture-tabs-wrapper.show-fade-right::after { opacity: 1; }

        /* --- Content area styling --- */
        #dynamic-question-area {
            margin-top: 0;
            position: relative;
            min-height: 300px;
        }
        .lecture-content {
            opacity: 1;
            background-color: var(--container-bg);
            width: 100%;
            transition: background-color 0.3s ease;
        }
        
        /* --- Staggered fade-in animation --- */
        .stagger-fade-in {
            animation: staggerFadeIn 0.7s ease-out forwards;
        }
        .question-animate {
            opacity: 0;
        }

        /* --- Section/Question Styles --- */
        .section-title {
            display: flex;
            align-items: center;
            background: var(--section-title-bg-light);
            color: white;
            border-radius: 12px;
            padding: 8px 20px;
            margin: 25px 0 20px 0;
            transition: background 0.3s ease;
        }
        .section-title h2 {
            font-size: 1.4rem;
            font-weight: normal;
            font-family: var(--section-title-font);
            margin: 0;
            flex-grow: 1;
        }
        .section-title i {
            margin-right: 0.6rem;
            font-size: 1.2em;
        }
        .question {
            background-color: var(--question-bg);
            border-left: 5px solid var(--question-border);
            padding: 18px;
            margin: 20px 0;
            border-radius: 5px;
            box-shadow: var(--question-shadow);
            transition: background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .question p.font-semibold {
            font-family: var(--question-header-font);
            font-weight: 600;
            margin-bottom: 10px;
            color: var(--question-header-text);
            font-size: 1.05em;
            line-height: 1.5;
            transition: color 0.3s ease;
        }
        .case-description {
            background-color: #e0f2fe;
            border: 1px solid #7dd3fc;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-style: italic;
            color: #0c4a6e;
        }


        /* --- Explanation/Answer Styles --- */
        .explanation {
            font-family: var(--qa-font-family);
            background-color: var(--explanation-bg);
            border-left: 5px solid var(--explanation-border);
            padding: 15px;
            border-radius: 8px;
            margin-top: 10px;
            box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
            transition: background-color 0.3s ease, border-color 0.3s ease;
        }
        .explanation p {
            font-family: var(--qa-font-family);
            font-size: 14px;
            color: var(--explanation-text);
            line-height: 1.6;
            transition: color 0.3s ease;
        }
        .explanation p strong {
            color: var(--explanation-strong-text);
            font-weight: bold;
            transition: color 0.3s ease;
        }
        .written-answer-label {
            font-family: var(--qa-font-family);
            font-weight: bold;
            color: var(--written-label-text);
            margin-bottom: 6px;
            font-size: 1.1em;
            transition: color 0.3s ease;
        }
        .written-explanation {
            font-family: var(--qa-font-family);
            background-color: var(--written-expl-bg);
            border: 1px solid var(--written-expl-border);
            padding: 18px;
            border-radius: 8px;
            margin-top: 8px;
            box-shadow: inset 0 1px 2px rgba(0,0,0,0.04);
            transition: background-color 0.3s ease, border-color 0.3s ease;
        }
        .written-explanation p {
            font-family: var(--qa-font-family);
            font-size: 14px;
            color: var(--written-expl-text);
            line-height: 1.6;
            transition: color 0.3s ease;
        }
        .written-explanation strong {
            font-weight: bold;
            color: var(--written-expl-strong-text);
            transition: color 0.3s ease;
        }
        .written-explanation em { font-style: italic; color: var(--written-label-text); transition: color 0.3s ease;}
        .mcq-option {
            font-family: var(--qa-font-family);
            padding: 8px 12px;
            margin: 6px 0;
            border-radius: 6px;
            border: 1px solid var(--mcq-option-border);
            background-color: var(--mcq-option-bg);
            font-size: 14px;
            color: var(--mcq-option-text);
            transition: background-color 0.2s, border-color 0.2s, color 0.3s ease;
        }
        .mcq-option:hover {
            background-color: var(--mcq-option-hover-bg);
            border-color: var(--mcq-option-hover-border);
        }
        .written-question-container {
            margin-bottom: 12px;
        }

        /* --- Show Answer Button Styles --- */
        .show-answer-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 5px 10px;
            background: var(--show-answer-gradient);
            color: white;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-size: 0.9em;
            font-weight: 600;
            transition: background 0.2s ease-in-out, transform 0.1s ease, box-shadow 0.2s ease;
            margin-top: 12px;
            box-shadow: var(--show-answer-shadow);
            min-width: 110px;
            text-align: center;
        }
        .show-answer-btn:hover {
            background: var(--show-answer-hover-gradient);
            box-shadow: var(--show-answer-hover-shadow);
        }
        .show-answer-btn:active {
            transform: scale(0.97);
            box-shadow: 0 1px 2px rgba(59, 130, 246, 0.15);
        }

        /* --- Answer Container Animation --- */
        .answer-container {
            display: grid;
            grid-template-rows: 0fr;
            opacity: 0;
            margin-top: 0;
            transition: grid-template-rows 0.4s ease-in-out, opacity 0.3s ease-in-out 0.1s, margin-top 0.4s ease-in-out;
        }
        .answer-container.answer-visible {
            grid-template-rows: 1fr;
            opacity: 1;
            margin-top: 0.75rem;
        }
        .answer-container > div {
            overflow: hidden;
        }

        /* --- Mobile-Specific Styles --- */
        @media (max-width: 768px) {
            .quiz-active {
                font-size: 15px;
            }
            .header {
                padding: 15px 0;
                gap: 10px;
                margin-bottom: 15px;
            }
            .header h1 {
                font-size: 2.5rem;
                top: -5px;
            }
            .header-img {
                height: 60px;
                width: 60px;
            }
            #lecture-tabs-wrapper {
                padding: 0 5px;
                padding-bottom: 10px;
                margin-bottom: 15px;
            }
            #lecture-tabs {
                gap: 8px;
                padding: 5px 1px;
            }
            #lecture-tabs button.lecture-tab-btn {
                font-size: 0.875rem;
                padding: 0.5rem 1rem;
            }
            #lecture-tabs-wrapper::before,
            #lecture-tabs-wrapper::after {
                width: 40px;
                bottom: 10px;
            }
            .section-title {
                padding: 3px 15px;
                border-radius: 12px;
                margin: 20px 0 15px 0;
            }
            .section-title h2 {
                font-size: 1.2rem;
            }
            .section-title i {
                font-size: 1.1em;
                margin-right: 0.5rem;
            }
            .question {
                padding: 15px;
                margin: 15px 0;
                border-radius: 5px;
            }
            .question p.font-semibold {
                font-size: 1em;
            }
            .explanation, .written-explanation {
                padding: 12px;
                border-radius: 6px;
            }
            .mcq-option {
                font-size: 0.85em;
                padding: 6px 10px;
                border-radius: 4px;
            }
            .explanation p, .written-explanation p {
                font-size: 0.85em;
            }
            .written-answer-label {
                font-size: 1em;
            }
            .show-answer-btn {
                font-size: 0.85em;
                padding: 5px 10px;
                border-radius: 12px;
                min-width: 100px;
            }
            .answer-container.answer-visible {
                margin-top: 0.6rem;
            }
        }
    `}</style>
);

const MCQQuestion: React.FC<{ questionData: MCQ; lectureId: string; index: number; level: number }> = ({ questionData, lectureId, index, level }) => {
    const [isAnswerVisible, setAnswerVisible] = React.useState(false);
    const answerId = `answer-mcq-${lectureId}-${level}-${index}`;

    const toggleAnswer = () => {
        setAnswerVisible(prev => !prev);
    };

    return (
        <div className="question question-animate selectable">
            <p className="font-semibold selectable">{questionData.q}</p>
            <div className="mt-2 mb-2">
                {questionData.o.map((option, i) => (
                    <div key={i} className="mcq-option selectable">
                        {option}
                    </div>
                ))}
            </div>

            <button
                type="button"
                className="show-answer-btn"
                onClick={toggleAnswer}
                aria-expanded={isAnswerVisible}
                aria-controls={answerId}
            >
                {isAnswerVisible ? 'Hide Answer' : 'Show Answer'}
            </button>

            <div
                id={answerId}
                className={`answer-container ${isAnswerVisible ? 'answer-visible' : ''}`}
                role="region"
                aria-hidden={!isAnswerVisible}
            >
                <div>
                    <div className="explanation selectable">
                        <p><strong>Answer:</strong> {questionData.a}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};


const WrittenQuestion: React.FC<{ questionCase: WrittenCase; lectureId: string; caseIndex: number }> = ({ questionCase, lectureId, caseIndex }) => {
    return (
        <div className="question question-animate selectable">
            <div className="case-description selectable" dangerouslySetInnerHTML={{ __html: questionCase.case }} />
            {questionCase.subqs.map((subq, subqIndex) => {
                const [isAnswerVisible, setAnswerVisible] = React.useState(false);
                const answerId = `answer-written-${lectureId}-${caseIndex}-${subqIndex}`;

                const toggleAnswer = () => {
                    setAnswerVisible(prev => !prev);
                };

                return (
                    <div key={subqIndex} className="written-question-container mt-4 pt-4 border-t border-gray-200 first:mt-0 first:pt-0 first:border-t-0">
                        <p className="font-semibold selectable">{subq.q}</p>
                        <button
                            type="button"
                            className="show-answer-btn"
                            onClick={toggleAnswer}
                            aria-expanded={isAnswerVisible}
                            aria-controls={answerId}
                        >
                            {isAnswerVisible ? 'Hide Answer' : 'Show Answer'}
                        </button>
                        <div
                            id={answerId}
                            className={`answer-container ${isAnswerVisible ? 'answer-visible' : ''}`}
                            role="region"
                            aria-hidden={!isAnswerVisible}
                        >
                            <div>
                                <p className="written-answer-label">Answer:</p>
                                <div className="written-explanation selectable">
                                    <p dangerouslySetInnerHTML={{ __html: subq.a }} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const LectureContent: React.FC<{ lecture: Lecture }> = ({ lecture }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        
        const questionsToAnimate = Array.from(container.querySelectorAll('.question-animate'));
        const baseDelay = 70; // ms

        questionsToAnimate.forEach((el, index) => {
            (el as HTMLElement).style.animationDelay = `${index * baseDelay}ms`;
            el.classList.add('stagger-fade-in');
        });
    }, [lecture]);

    if (!lecture) return null;
    
    // Defensive check to ensure properties are arrays
    const mcqsLevel1 = Array.isArray(lecture.mcqs_level_1) ? lecture.mcqs_level_1 : [];
    const mcqsLevel2 = Array.isArray(lecture.mcqs_level_2) ? lecture.mcqs_level_2 : [];
    const writtenCases = Array.isArray(lecture.written) ? lecture.written : [];

    return (
        <div ref={containerRef} className="lecture-content">
            {mcqsLevel1.length > 0 && (
                <>
                    <div className="section-title">
                        <i className="fas fa-list-check"></i>
                        <h2>Level 1 - MCQs:</h2>
                    </div>
                    {mcqsLevel1.map((mcq, index) => (
                        <MCQQuestion key={`mcq-l1-${index}`} questionData={mcq} lectureId={lecture.id} index={index} level={1}/>
                    ))}
                </>
            )}
            {mcqsLevel2.length > 0 && (
                <>
                    <div className="section-title mt-10">
                        <i className="fas fa-list-check"></i>
                        <h2>Level 2 - MCQs:</h2>
                    </div>
                    {mcqsLevel2.map((mcq, index) => (
                        <MCQQuestion key={`mcq-l2-${index}`} questionData={mcq} lectureId={lecture.id} index={index} level={2}/>
                    ))}
                </>
            )}
            {writtenCases.length > 0 && (
                <>
                    <div className="section-title mt-10">
                        <i className="fas fa-pencil"></i>
                        <h2>Written Questions:</h2>
                    </div>
                    {writtenCases.map((wq, index) => (
                        <WrittenQuestion key={`written-${index}`} questionCase={wq} lectureId={lecture.id} caseIndex={index} />
                    ))}
                </>
            )}
        </div>
    );
};


export function QuizContainer({ lectures: rawLecturesData }: { lectures: Lecture[] | Lecture }) {
    
    // This is the critical fix. Ensure `lectures` is always an array.
    const lectures = Array.isArray(rawLecturesData) ? rawLecturesData : (rawLecturesData ? [rawLecturesData] : []);
    
    const [activeLectureId, setActiveLectureId] = React.useState(lectures[0]?.id);
    
    const tabsWrapperRef = React.useRef<HTMLDivElement>(null);
    const tabsContainerRef = React.useRef<HTMLDivElement>(null);

    // --- Dynamic Font & Icon Loading ---
    React.useEffect(() => {
        document.body.classList.add('quiz-active');
        const fontLinks = [
            { id: 'font-awesome', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css', rel: 'stylesheet' },
            { id: 'google-fonts-preconnect-1', href: 'https://fonts.googleapis.com', rel: 'preconnect' },
            { id: 'google-fonts-preconnect-2', href: 'https://fonts.gstatic.com', rel: 'preconnect', crossOrigin: 'anonymous' as const },
            { id: 'google-fonts-main', href: 'https://fonts.googleapis.com/css2?family=Coiny&family=Calistoga&display=swap', rel: 'stylesheet' }
        ];

        fontLinks.forEach(linkInfo => {
            if (!document.getElementById(linkInfo.id)) {
                const link = document.createElement('link');
                link.id = linkInfo.id;
                link.rel = linkInfo.rel;
                link.href = linkInfo.href;
                if (linkInfo.crossOrigin) {
                    (link as HTMLLinkElement).crossOrigin = linkInfo.crossOrigin;
                }
                document.head.appendChild(link);
            }
        });

        // Cleanup function to remove classes and links when the component unmounts
        return () => {
            document.body.classList.remove('quiz-active');
            fontLinks.forEach(linkInfo => {
                const linkElement = document.getElementById(linkInfo.id);
                if (linkElement) {
                    // In a Next.js app with client-side navigation, it might be better
                    // to not remove the fonts to avoid re-fetching on every navigation.
                    // If this component is the only one using them, removal is fine.
                    // document.head.removeChild(linkElement);
                }
            });
        };
    }, []);


    React.useEffect(() => {
        const tabsContainer = tabsContainerRef.current;
        const tabsWrapper = tabsWrapperRef.current;
        if (!tabsContainer || !tabsWrapper) return;

        const checkTabOverflow = () => {
            requestAnimationFrame(() => {
                if(!tabsContainer) return;
                const { scrollLeft, scrollWidth, clientWidth } = tabsContainer;
                const tolerance = 2;
                (tabsWrapper as HTMLElement).classList.toggle('show-fade-left', scrollLeft > tolerance);
                (tabsWrapper as HTMLElement).classList.toggle('show-fade-right', scrollWidth - scrollLeft - clientWidth > tolerance);
            });
        };

        checkTabOverflow();
        tabsContainer.addEventListener('scroll', checkTabOverflow, { passive: true });
        window.addEventListener('resize', checkTabOverflow);
        const resizeObserver = new ResizeObserver(checkTabOverflow);
        resizeObserver.observe(tabsContainer);
        
        return () => {
            if(tabsContainer){
              tabsContainer.removeEventListener('scroll', checkTabOverflow);
            }
            window.removeEventListener('resize', checkTabOverflow);
            resizeObserver.disconnect();
        };
    }, []);
    
    const switchTab = (lectureId: string) => {
        setActiveLectureId(lectureId);
        const targetButton = (tabsContainerRef.current as HTMLElement)?.querySelector(`button[data-lecture-id="${lectureId}"]`);
        targetButton?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    };

    const activeLecture = lectures.find(lec => lec.id === activeLectureId);

    return (
        <div className={cn("page-container", "bg-transparent p-0")}>
            <GlobalStyles />
            <div id="lecture-tabs-wrapper" ref={tabsWrapperRef}>
                <div id="lecture-tabs" ref={tabsContainerRef} role="tablist" aria-label="Lectures">
                    {lectures.map(lecture => (
                        <button
                            key={lecture.id}
                            type="button"
                            className={`lecture-tab-btn ${activeLectureId === lecture.id ? 'active' : ''}`}
                            onClick={() => switchTab(lecture.id)}
                            data-lecture-id={lecture.id}
                            role="tab"
                            aria-selected={activeLectureId === lecture.id}
                        >
                            {lecture.name}
                        </button>
                    ))}
                </div>
            </div>

            <div id="questions-container">
                <div id="dynamic-question-area">
                    {activeLecture ? (
                        <LectureContent key={activeLecture.id} lecture={activeLecture} />
                    ) : (
                        <p className="p-4 text-center">No lectures available.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
