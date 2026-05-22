import os
import json
import logging
from typing import Dict, List, Optional, Any
import google.generativeai as genai

try:
    from langchain_google_genai import GoogleGenAIEmbeddings
except ImportError:
    GoogleGenAIEmbeddings = None

logger = logging.getLogger("prepai.ai_service")


class AIService:
    """
    A reusable AI Service for EduAI that interfaces with Google Generative AI (Gemini).
    Provides utility methods to solve doubts, summarize PDFs, and generate explanations.
    """
    def __init__(self):
        # Fetch the Gemini API key from environment variables
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.is_configured = False
        
        # Validate if key is configured and not the default placeholder
        if self.api_key and self.api_key != "your_gemini_api_key_here" and len(self.api_key.strip()) > 10:
            try:
                genai.configure(api_key=self.api_key)
                self.is_configured = True
                logger.info("Gemini API Service successfully configured!")
            except Exception as e:
                logger.error(f"Error configuring Gemini client: {e}")
                self.is_configured = False
        else:
            logger.warning("GEMINI_API_KEY is not configured or using default placeholder in .env.")

    def solve_general_doubt(
        self,
        question: str,
        subject: Optional[str] = "general",
        image_data: Optional[str] = None,
        image_mime: Optional[str] = None,
        context: Optional[str] = None
    ) -> Dict:
        """
        Solves student doubts using Gemini 2.5 Flash if active, or local academic fallbacks.
        """
        import base64
        import re

        question_cleaned = question.strip()
        subject_name = subject or "general"

        # Setup fallback data structure
        academic_fallbacks = {
            "physics": """### **Electromagnetic Induction & Faraday's Laws**

Electromagnetic Induction is a core JEE/NEET topic that describes the generation of electric current by changing magnetic fields.

#### **1. Magnetic Flux ($\\Phi_B$)**
Magnetic flux measures the total magnetic field lines passing through a given area.
$$\\Phi_B = \\vec{B} \\cdot \\vec{A} = B A \\cos(\\theta)$$
* Where $\\theta$ is the angle between the magnetic field vector $\\vec{B}$ and the area vector $\\vec{A}$.
* **Unit**: Weber (Wb) or Tesla-meter squared ($T\\cdot m^2$).

#### **2. Faraday's Laws of Electromagnetic Induction**
* **First Law**: Whenever the magnetic flux linked with a closed circuit changes, an electromotive force (EMF) is induced in the circuit.
* **Second Law**: The magnitude of the induced EMF ($e$) is directly proportional to the rate of change of magnetic flux linked with the circuit.
$$e = -\\frac{d\\Phi_B}{dt}$$

#### **3. Lenz's Law (The Negative Sign)**
The negative sign in Faraday's formula represents **Lenz's Law**, which is a direct consequence of the *Conservation of Energy*.
> *"The direction of the induced current is always such that it opposes the change in magnetic flux that produced it."*

---

### **Step-by-Step Example Problems**
**Problem**: A circular loop of radius $r = 0.1\\text{ m}$ is placed perpendicular to a uniform magnetic field $B(t) = 0.2t + 0.5t^2$ Tesla. Find the induced EMF at $t = 2\\text{ seconds}$.

**Solution**:
1. **Find Area ($A$)**: 
   $$A = \\pi r^2 = \\pi (0.1)^2 = 0.01\\pi \\approx 0.0314\\text{ m}^2$$
2. **Find Flux ($\\Phi_B$)**: Since $\\theta = 0^\\circ$ (perpendicular to loop surface means parallel to area vector):
   $$\\Phi_B(t) = B(t) \\cdot A = (0.2t + 0.5t^2)(0.01\\pi)$$
3. **Differentiate Flux to find EMF**:
   $$\\frac{d\\Phi_B}{dt} = (0.2 + 1.0t)(0.01\\pi)$$
4. **Evaluate at $t = 2$**:
   $$e = -[0.2 + 1.0(2)](0.01\\pi) = -(2.2)(0.01\\pi) = -0.022\\pi\\text{ V} \\approx -0.069\\text{ V}$$
* **Induced EMF Magnitude**: **$69\\text{ mV}$** opposing the increasing field!

---
> [!TIP]
> **JEE/NEET Tip**: Keep a close watch on the direction of current in loop questions. Use the **Right-Hand Thumb Rule** to quickly identify flux directions. Positive change in flux out of the page induces a clockwise current!""",

            "math": """### **Integration by Parts (ILATE Rule)**

Integration by parts is a key calculus technique used to integrate the product of two functions. It is derived from the product rule of differentiation.

#### **The Formula**
$$\\int u \\, dv = u v - \\int v \\, du$$
Alternatively written as:
$$\\int f(x)g(x)\\,dx = f(x)\\int g(x)\\,dx - \\int \\left( f'(x)\\int g(x)\\,dx \\right) dx$$

#### **The ILATE Selection Rule**
To choose which function should be $u$ (first function) and which should be $dv$ (second function), we follow the **ILATE** priority order (highest to lowest priority for $u$):
1. **I** - **I**nverse Trigonometric functions (e.g., $\\sin^{-1}x$, $\\tan^{-1}x$)
2. **L** - **L**ogarithmic functions (e.g., $\\ln x$, $\\log x$)
3. **A** - **A**lgebraic functions (e.g., $x^2$, $3x$, $x+1$)
4. **T** - **T**rigonometric functions (e.g., $\\sin x$, $\\cos x$)
5. **E** - **E**xponential functions (e.g., $e^x$, $2^x$)

---

### **Walkthrough: $\\int x \\cos(x) \\, dx$**

1. **Identify the functions**:
   * $x$ is **Algebraic** (**A**)
   * $\\cos(x)$ is **Trigonometric** (**T**)
   * According to **ILATE**, **A** comes before **T**. Therefore:
     $$u = x \\quad \\text{and} \\quad dv = \\cos(x)\\,dx$$
2. **Compute $du$ and $v$**:
   * $du = dx$
   * $v = \\int \\cos(x)\\,dx = \\sin(x)$
3. **Apply the formula**:
   $$\\int x \\cos(x)\\,dx = (x)(\\sin x) - \\int \\sin(x)\\,dx$$
4. **Solve the final integral**:
   $$\\int x \\cos(x)\\,dx = x \\sin(x) - (-\\cos x) + C$
   $$\\int x \\cos(x)\\,dx = x \\sin(x) + \\cos(x) + C$$

---
> [!NOTE]
> **Common Trap**: Forgetting the constant of integration ($C$) in indefinite integrals will cost you marks in JEE/NEET board formats, and failing to verify the limits of integration can invalidate definite integration problems.""",

            "chemistry": """### **$S_N1$ (Substitution Nucleophilic Unimolecular) Mechanism**

The $S_N1$ reaction is a fundamental pathway in organic chemistry representing nucleophilic substitution. It is highly favored by tertiary substrates.

#### **Key Characteristics**
* **Kinetics**: First-order reaction. The rate depends only on substrate concentration.
  $$\\text{Rate} = k[\\text{Substrate}]$$
* **Steps**: **Two-step mechanism** involving a carbocation intermediate.
* **Solvent**: Favored by **polar protic solvents** (like $H_2O$, $EtOH$) which stabilize the carbocation.

---

#### **Detailed Two-Step Mechanism**

```
Step 1: Carbocation Formation (Rate Determining Step - SLOW)
      R-LG  ======>  R+  +  LG-
  (Substrate)     (Carbocation) (Leaving Group)

Step 2: Nucleophilic Attack (FAST)
      R+  +  Nu-  ======>  R-Nu
```

#### **Stereochemical Outcome (Racemization)**
Because the carbocation intermediate is **planar ($sp^2$ hybridized)**, the nucleophile can attack from either the front or the back face with equal probability.
* This leads to a **racemic mixture** (approx. 50% retention of configuration and 50% inversion of configuration) if the reacting carbon is chiral.

---

### **Substrate Reactivity Order**
Due to carbocation stability ($3^\\circ > 2^\\circ > 1^\\circ > \\text{methyl}$):
$$\\text{Tertiary Halide (Fastest)} > \\text{Secondary Halide} >> \\text{Primary Halide (Slowest)}$$
* *Allylic* and *benzylic* halides also react extremely fast via $S_N1$ due to resonance stabilization of the intermediate.

---
> [!WARNING]
> **Carbocation Rearrangements**: Always check if a hydride ($\\text{H}^-$) shift or methyl ($\\text{CH}_3^-$) shift can occur to form a more stable carbocation intermediate before step 2!""",

            "biology": """### **Double Circulation in Humans**

Human physiology relies on a highly efficient cardiovascular system featuring **Double Circulation**. This separates oxygenated and deoxygenated blood to maximize metabolic efficiency.

#### **1. Pulmonary Circulation**
Moves deoxygenated blood from the heart to the lungs for oxygenation and returns oxygenated blood to the heart.
* **Pathway**: Right Ventricle $\\to$ Pulmonary Artery $\\to$ Lungs $\\to$ Pulmonary Veins $\\to$ Left Atrium.

#### **2. Systemic Circulation**
Distributes oxygenated blood from the heart to all tissues of the body and collects deoxygenated blood back.
* **Pathway**: Left Ventricle $\\to$ Aorta $\\to$ Body Organs $\\to$ Vena Cava $\\to$ Right Atrium.

---

### **The Heart Pathway Summary**
1. **Deoxygenated blood** enters the **Right Atrium** via Superior & Inferior Vena Cava.
2. Passes through the **Tricuspid Valve** to the **Right Ventricle**.
3. Pumped out of the **Pulmonary Semilunar Valve** via the **Pulmonary Artery** to the lungs.
4. **Oxygenated blood** returns from the lungs via **Pulmonary Veins** to the **Left Atrium**.
5. Passes through the **Bicuspid (Mitral) Valve** into the **Left Ventricle**.
6. Pumped out of the **Aortic Semilunar Valve** via the **Aorta** to the entire body.

---
> [!TIP]
> **NEET Fact**: The Left Ventricle wall is **3 times thicker** than the Right Ventricle wall because it must generate enough pressure to pump blood throughout the entire systemic loop, whereas the right side only pumps to the nearby lungs."""
        }

        # Offline fallback selector
        query_lower = question_cleaned.lower()
        matched_content = None
        matched_subject = subject_name.capitalize()

        if "induction" in query_lower or "electromagnetic" in query_lower or "faraday" in query_lower or "flux" in query_lower or "lenz" in query_lower:
            matched_content = academic_fallbacks.get("physics")
            matched_subject = "Physics"
        elif "integration" in query_lower or "parts" in query_lower or "integrate" in query_lower or "ilate" in query_lower or "calculus" in query_lower:
            matched_content = academic_fallbacks.get("math")
            matched_subject = "Mathematics"
        elif "sn1" in query_lower or "sn2" in query_lower or "nucleophilic" in query_lower or "reaction" in query_lower or "mechanism" in query_lower or "organic" in query_lower:
            matched_content = academic_fallbacks.get("chemistry")
            matched_subject = "Chemistry"
        elif "circulation" in query_lower or "double circulation" in query_lower or "heart" in query_lower or "pulmonary" in query_lower or "blood" in query_lower or "physiology" in query_lower:
            matched_content = academic_fallbacks.get("biology")
            matched_subject = "Biology"
        else:
            # General fallback response
            extracted_topics = re.findall(r'\b[a-zA-Z]{4,15}\b', question_cleaned)
            highlighted_topics = ", ".join([f"**{t.capitalize()}**" for t in extracted_topics[:3]]) or "**Concept Exploration**"
            matched_content = f"""### **Expert Analysis: Conceptual Overview**

Thank you for your doubt! Here is a structured explanation addressing your question: *"{question_cleaned}"*

#### **1. Key Conceptual Pillars**
To solve or understand this, we must unpack these key pillars:
* {highlighted_topics}: The fundamental foundation of this topic.
* **Problem Analysis**: Understanding the parameters, boundary conditions, or definitions involved in your query.
* **Exam Relevance**: This concept appears frequently in multi-concept questions, particularly where theoretical understanding is combined with quick mathematical/logical reasoning.

#### **2. Step-by-Step Explanation**
* **Step 1 (Core Definition)**: Understand that this problem relies on the primary relationship between the variables involved. Make sure your units are always in standard SI format before initiating calculations.
* **Step 2 (Analytical Approach)**: Draw a free-body diagram, reaction path, or coordinate framework. Write down all known formulas related to the terms mentioned in the question.
* **Step 3 (Solving Process)**: Substitute values or logical premises step-by-step. Avoid shortcuts until you are 100% confident in the fundamental principle.

---

### **JEE/NEET Study Tip**
> [!NOTE]
> When faced with general questions in this category, competitive exams often test edge cases (like extreme values, zero-flux positions, or transition state stabilities). **Always master the boundary rules first!**
"""

        offline_fallback = {
            "success": True,
            "answer": matched_content,
            "source": "Local Syllabus Expert Engine",
            "subject": matched_subject
        }

        if not self.is_configured:
            return offline_fallback

        try:
            system_prompt = (
                "You are an expert AI tutor for students preparing for highly competitive exams like "
                "JEE Main, JEE Advanced, and NEET. Provide highly detailed, step-by-step academic explanations. "
                "Use markdown, bold terms, bullet points, and markdown math equations (using $...$ for inline "
                "and $$...$$ for block equations) to render formulas perfectly. Keep your tone encouraging "
                "and focus on clear conceptual learning."
            )

            user_prompt = ""
            if context:
                user_prompt += f"Context from study material:\n\"\"\"{context[:3000]}\"\"\"\n\n"
            
            user_prompt += f"Subject: {matched_subject}\nQuestion: {question_cleaned}"

            # Load the Gemini 2.5 Flash model
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction=system_prompt
            )

            if image_data and image_mime:
                b64_data = image_data
                if "," in b64_data:
                    b64_data = b64_data.split(",")[1]
                
                image_parts = {
                    "mime_type": image_mime,
                    "data": base64.b64decode(b64_data)
                }
                response = model.generate_content([user_prompt, image_parts])
            else:
                response = model.generate_content(user_prompt)

            return {
                "success": True,
                "answer": response.text,
                "source": "Gemini 2.5 Flash API",
                "subject": matched_subject
            }
        except Exception as e:
            logger.error(f"Gemini API solve_general_doubt error: {e}. Falling back to offline guide.")
            return offline_fallback

    def summarize_pdf_text(self, text: str) -> Dict:
        """
        Summarizes extracted PDF text content using Gemini API.
        
        Returns:
            Dict matching output format:
            {
                "success": bool,
                "source": str,
                "summary": "### Short Summary\n...\n\n### Detailed Summary\n...",
                "key_points": ["...", "..."]
            }
        """
        # Validate input text
        if not text or not text.strip():
            return {
                "success": False,
                "source": "Offline Summarizer Engine",
                "summary": "### ❌ Error\n\nNo text content was found or extracted from the PDF to summarize.",
                "key_points": ["Could not parse empty file text content."]
            }
            
        # Truncate text context to prevent token overflows on free tier limits
        truncated_text = text[:15000]

        # Setup standard offline fallback guide when no live API key is configured
        offline_fallback = {
            "success": True,
            "source": "Offline Study Assistant Engine",
            "summary": (
                "### 📝 Short Summary\n"
                "This document has been successfully parsed and saved! A live Gemini API key is "
                "required to generate intelligent structural AI summaries.\n\n"
                "### 📖 Detailed Summary\n"
                f"We extracted **{len(text)} characters** from your PDF. High-fidelity dynamic conceptual "
                "summarization is currently in offline mode because a valid `GEMINI_API_KEY` was not "
                "detected in your `backend/.env` file.\n\n"
                "#### **Preview of Extracted Content:**\n"
                f"\"{truncated_text[:600]}...\""
            ),
            "key_points": [
                f"Parsed File Size: {len(text)} characters of text extracted",
                "API Status: Offline fallback active (GEMINI_API_KEY is missing or invalid)",
                "To enable AI Summaries: Please define a valid Gemini key in backend/.env"
            ]
        }

        # If Gemini is not configured, immediately return our high-quality offline explanation card
        if not self.is_configured:
            return offline_fallback

        try:
            # Set up strict JSON instructions for Gemini
            system_instruction = (
                "You are an expert AI tutor and academic study planner for competitive exams like JEE and NEET. "
                "Your goal is to summarize the provided PDF textbook/notes extract in a clear, highly-educational structure.\n\n"
                "You MUST return your response as a strict JSON string. The JSON object must contain exactly "
                "two keys: 'summary' and 'key_points'.\n"
                "1. 'summary' must be a string containing a 'Short Summary' and a 'Detailed Summary' formatted with markdown headings as follows:\n"
                "   ### Short Summary\n"
                "   [A brief 2-3 sentence high-level conceptual overview]\n\n"
                "   ### Detailed Summary\n"
                "   [A detailed, step-by-step conceptual guide divided into concept sub-headings, definitions, and bold equations]\n"
                "2. 'key_points' must be an array of strings, listing the core takeaways, crucial formulas (using markdown math $...$), or exam tips.\n\n"
                "Rules:\n"
                "- Do NOT surround your response in markdown code blocks like ```json ... ```. Output only the raw, parsable JSON string.\n"
                "- Ensure all double quotes inside the string values are correctly escaped."
            )

            user_prompt = f"Please summarize this study guide text:\n\n\"\"\"\n{truncated_text}\n\"\"\""

            # Load the Gemini 2.5 Flash model
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction=system_instruction
            )

            # Generate contents forcing JSON mime type
            response = model.generate_content(
                user_prompt,
                generation_config={"response_mime_type": "application/json"}
            )

            # Attempt to decode JSON response
            try:
                data = json.loads(response.text)
                return {
                    "success": True,
                    "source": "Gemini 2.5 Flash API",
                    "summary": data.get("summary", "No summary generated."),
                    "key_points": data.get("key_points", [])
                }
            except Exception as parse_err:
                logger.warning(f"Failed to directly parse Gemini JSON: {parse_err}. Re-cleaning string...")
                # Fallback cleaning if Gemini wraps it in markdown blocks regardless of instruction
                cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
                data = json.loads(cleaned_text)
                return {
                    "success": True,
                    "source": "Gemini 2.5 Flash API (Recovered)",
                    "summary": data.get("summary", "No summary generated."),
                    "key_points": data.get("key_points", [])
                }

        except Exception as err:
            logger.error(f"Gemini API Summarization Error: {err}. Falling back to offline guide.")
            # Set the error detail in our fallback response so users can troubleshoot
            offline_fallback["error_details"] = str(err)
            return offline_fallback

    def generate_quiz(self, text: str, difficulty: str = "medium", num_questions: int = 5) -> Dict:
        """
        Generates a multiple-choice quiz from extracted PDF text content using Gemini API.
        
        Args:
            text (str): Extracted study text content.
            difficulty (str): 'easy', 'medium', or 'hard'.
            num_questions (int): Total number of questions to generate (1-10).
            
        Returns:
            Dict matching required format:
            {
                "success": bool,
                "source": str,
                "questions": [
                    {
                        "question": "...",
                        "options": ["A", "B", "C", "D"],
                        "answer": "A",
                        "explanation": "..."
                    }
                ]
            }
        """
        # Validate inputs
        if not text or not text.strip():
            return {
                "success": False,
                "source": "Offline Quiz Engine",
                "questions": []
            }
            
        truncated_text = text[:15000]
        difficulty_lower = difficulty.lower().strip()
        
        # 1. Setup a rich, comprehensive Offline Fallback bank covering key JEE/NEET topics
        # This keeps the application fully functional and interactive even without a live API key!
        mock_database = {
            "physics": [
                {
                    "question": "What is the physical significance of the negative sign in Faraday's Law of Electromagnetic Induction ($e = -d\\Phi_B / dt$)?",
                    "options": [
                        "It indicates that EMF is a vector quantity acting downwards.",
                        "It represents Lenz's Law, indicating the induced EMF opposes the flux change.",
                        "It signifies that electrical energy is lost as thermal heat.",
                        "It denotes that the magnetic field strength is decreasing over time."
                    ],
                    "answer": "B",
                    "explanation": "The negative sign represents Lenz's Law, which states that the direction of the induced current opposes the change in magnetic flux that created it, conforming to the Conservation of Energy."
                },
                {
                    "question": "A loop of area $0.05 \\text{ m}^2$ is placed perpendicular to a magnetic field that changes from $0.2 \\text{ T}$ to $0.6 \\text{ T}$ in $0.1 \\text{ s}$. Find the induced EMF.",
                    "options": [
                        "0.1 V",
                        "0.2 V",
                        "0.4 V",
                        "0.5 V"
                    ],
                    "answer": "B",
                    "explanation": "Induced EMF is given by $e = -A \\cdot \\Delta B / \\Delta t$. Here, $A = 0.05$, $\\Delta B = 0.6 - 0.2 = 0.4 \\text{ T}$, and $\\Delta t = 0.1 \\text{ s}$. Thus, $e = 0.05 \\cdot (0.4 / 0.1) = 0.05 \\cdot 4 = 0.2 \\text{ V}$."
                },
                {
                    "question": "Which of the following materials has a negative magnetic susceptibility ($\\chi < 0$)?",
                    "options": [
                        "Ferromagnetic materials",
                        "Paramagnetic materials",
                        "Diamagnetic materials",
                        "Electromagnetic materials"
                    ],
                    "answer": "C",
                    "explanation": "Diamagnetic materials oppose external magnetic fields, resulting in a negative magnetic susceptibility ($\\chi < 0$) and a relative permeability slightly less than 1."
                }
            ],
            "math": [
                {
                    "question": "Evaluate the integral: $\\int x \\cos(x) \\, dx$ using the ILATE rule.",
                    "options": [
                        "$x \\sin(x) + \\cos(x) + C$",
                        "$x \\sin(x) - \\cos(x) + C$",
                        "$-x \\cos(x) + \\sin(x) + C$",
                        "$x \\cos(x) + \\sin(x) + C$"
                    ],
                    "answer": "A",
                    "explanation": "Using integration by parts ($u = x, dv = \\cos(x)dx$): $\\int u \\, dv = u v - \\int v \\, du = x \\sin(x) - \\int \\sin(x)dx = x \\sin(x) - (-\\cos(x)) + C = x \\sin(x) + \\cos(x) + C$."
                },
                {
                    "question": "According to the ILATE rule for Integration by Parts, which function is chosen as 'u' in $\\int x^2 \\ln(x) \\, dx$?",
                    "options": [
                        "The Algebraic function: $x^2$",
                        "The Logarithmic function: $\\ln(x)$",
                        "The Exponential function: $e^x$",
                        "Either can be chosen arbitrarily"
                    ],
                    "answer": "B",
                    "explanation": "In ILATE priority order, Logarithmic (L) comes before Algebraic (A). Therefore, $u$ must be chosen as the Logarithmic function: $\\ln(x)$."
                }
            ],
            "chemistry": [
                {
                    "question": "Which of the following carbocations is the most stable during an $S_N1$ reaction pathway?",
                    "options": [
                        "Primary ($1^\\circ$) Carbocation",
                        "Secondary ($2^\\circ$) Carbocation",
                        "Tertiary ($3^\\circ$) Carbocation",
                        "Methyl Carbocation"
                    ],
                    "answer": "C",
                    "explanation": "Tertiary ($3^\\circ$) carbocations are highly stabilized by hyperconjugation and positive inductive (+I) effects from three surrounding alkyl groups, making them the most stable intermediates for $S_N1$ reactions."
                },
                {
                    "question": "What is the primary rate-determining step in a classic nucleophilic substitution $S_N1$ reaction?",
                    "options": [
                        "Attack of the nucleophile on the electrophilic carbon center.",
                        "Deprotonation of the intermediate complex.",
                        "Loss of the leaving group to form a stable carbocation intermediate.",
                        "Rearrangement of the carbon framework."
                    ],
                    "answer": "C",
                    "explanation": "The slow, rate-determining step of an $S_N1$ reaction is the heterolytic cleavage of the carbon-leaving group bond, which generates the highly reactive carbocation intermediate."
                }
            ],
            "general": [
                {
                    "question": "Which of the following is the standard SI unit of magnetic flux?",
                    "options": [
                        "Tesla (T)",
                        "Weber (Wb)",
                        "Henry (H)",
                        "Gauss (G)"
                    ],
                    "answer": "B",
                    "explanation": "The standard SI unit of magnetic flux is the Weber (Wb). One Weber is equal to one Tesla-meter squared ($T\\cdot m^2$)."
                },
                {
                    "question": "An ideal gas undergoes an isothermal expansion. What is the change in its internal energy ($\\Delta U$)?",
                    "options": [
                        "$\\Delta U > 0$",
                        "$\\Delta U < 0$",
                        "$\\Delta U = 0$",
                        "Depends on the pressure change"
                    ],
                    "answer": "C",
                    "explanation": "For an ideal gas, internal energy depends solely on temperature. In an isothermal process, the temperature remains constant ($\\Delta T = 0$), so the change in internal energy is zero ($\\Delta U = 0$)."
                }
            ]
        }

        # Determine matched topic from text heuristics
        text_lower = text.lower()
        topic = "general"
        if "induction" in text_lower or "magnetic" in text_lower or "faraday" in text_lower or "flux" in text_lower:
            topic = "physics"
        elif "integration" in text_lower or "parts" in text_lower or "calculus" in text_lower:
            topic = "math"
        elif "sn1" in text_lower or "carbocation" in text_lower or "organic" in text_lower or "reaction" in text_lower:
            topic = "chemistry"

        # Select offline fallback questions based on matched topic
        offline_questions = mock_database.get(topic, mock_database["general"])
        # Adjust difficulty details in explanations if easy/hard is selected
        adjusted_questions = []
        for i, q in enumerate(offline_questions[:num_questions]):
            adjusted_questions.append({
                "question": f"[{difficulty.upper()}] {q['question']}",
                "options": q["options"],
                "answer": q["answer"],
                "explanation": f"{q['explanation']} (Generated by offline fallback engine)."
            })
            
        offline_fallback = {
            "success": True,
            "source": "Offline Quiz Database Engine",
            "questions": adjusted_questions
        }

        # If Gemini is not configured, return high-quality syllabus fallbacks immediately
        if not self.is_configured:
            return offline_fallback

        try:
            # Set up strict JSON instructions for Gemini Quiz Generator
            system_instruction = (
                "You are an expert academic examiner for competitive exams like JEE and NEET. "
                "Your task is to analyze the provided study material and generate a high-quality "
                "multiple-choice quiz (MCQ) testing key concepts.\n\n"
                "You MUST return your response as a strict JSON string matching this exact format:\n"
                "{\n"
                "  \"questions\": [\n"
                "    {\n"
                "      \"question\": \"[A clear, conceptually challenging question testing core ideas]\",\n"
                "      \"options\": [\n"
                "        \"Option A content\",\n"
                "        \"Option B content\",\n"
                "        \"Option C content\",\n"
                "        \"Option D content\"\n"
                "      ],\n"
                "      \"answer\": \"A\",\n"
                "      \"explanation\": \"[A highly detailed step-by-step conceptual explanation of why the correct option is right and others are incorrect]\"\n"
                "    }\n"
                "  ]\n"
                "}\n\n"
                "Rules:\n"
                "- The 'answer' field must contain exactly a single uppercase letter: 'A', 'B', 'C', or 'D'.\n"
                "- Provide exactly 4 options per question.\n"
                "- Ensure the difficulty level matches the requested setting.\n"
                "- Use markdown math formatting ($...$ for inline and $$...$$ for blocks) for physical units and equations.\n"
                "- Do NOT surround your response in markdown code blocks like ```json ... ```. Output only the raw, parsable JSON string.\n"
                "- Ensure all double quotes inside the string values are correctly escaped."
            )

            user_prompt = (
                f"Please generate a multiple-choice quiz from this study guide text.\n"
                f"Difficulty Level: {difficulty_lower.upper()}\n"
                f"Number of Questions: {num_questions}\n\n"
                f"Study Material Text:\n\"\"\"\n{truncated_text}\n\"\"\""
            )

            # Load the Gemini 2.5 Flash model
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction=system_instruction
            )

            # Generate contents forcing JSON response mime type
            response = model.generate_content(
                user_prompt,
                generation_config={"response_mime_type": "application/json"}
            )

            # Attempt to decode JSON response
            try:
                data = json.loads(response.text)
                return {
                    "success": True,
                    "source": "Gemini 2.5 Flash API",
                    "questions": data.get("questions", [])
                }
            except Exception as parse_err:
                logger.warning(f"Failed to directly parse Gemini Quiz JSON: {parse_err}. Re-cleaning string...")
                # Fallback cleaning if Gemini wraps it in markdown blocks regardless of instruction
                cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
                data = json.loads(cleaned_text)
                return {
                    "success": True,
                    "source": "Gemini 2.5 Flash API (Recovered)",
                    "questions": data.get("questions", [])
                }

        except Exception as err:
            logger.error(f"Gemini API Quiz Generation Error: {err}. Falling back to offline bank.")
            return offline_fallback

    def get_embeddings_model(self) -> Optional[Any]:
        """
        Initializes and returns the LangChain Google GenAI Embeddings model.
        Uses text-embedding-004. Returns None if Gemini is not configured.
        """
        if not self.is_configured or GoogleGenAIEmbeddings is None:
            return None
            
        try:
            return GoogleGenAIEmbeddings(
                model="models/text-embedding-004",
                google_api_key=self.api_key
            )
        except Exception as e:
            logger.error(f"Error initializing Google GenAI Embeddings: {e}")
            return None

    def generate_rag_answer(self, question: str, retrieved_chunks: List[Dict[str, Any]]) -> Dict:
        """
        Generates a context-grounded RAG answer using the Gemini API.
        If offline or not configured, falls back to a clean mock response.
        """
        if not retrieved_chunks:
            return {
                "success": False,
                "answer": "> [!WARNING]\n> No reference context was found in your study material to answer this question. Please make sure the PDF contains relevant text.",
                "source": "EduAI RAG Engine",
                "sources_used": []
            }
            
        # Combine retrieved contexts for grounding
        context_blocks = []
        sources_used = []
        for i, chunk in enumerate(retrieved_chunks):
            context_blocks.append(f"--- Passage {i+1} ---\n{chunk['content']}")
            sources_used.append(chunk["content"])
            
        context_text = "\n\n".join(context_blocks)
        
        # Setup dynamic offline/invalid key fallback message
        is_invalid_key = self.api_key and self.api_key != "your_gemini_api_key_here"
        
        fallback_msg = (
            "### 📘 Offline Retrieval-Augmented Explanation\n"
            "We successfully completed an offline vector comparison of your question against the study guide!\n\n"
        )
        if is_invalid_key:
            fallback_msg += (
                "> [!WARNING]\n"
                "> **Invalid Gemini API Key**: The `GEMINI_API_KEY` defined in your `backend/.env` file appears to be invalid or expired. "
                "We have gracefully fallen back to **Local Comparison Mode** to keep your learning uninterrupted!\n\n"
            )
        else:
            fallback_msg += (
                "Since your backend is currently in **Offline Mode** (GEMINI_API_KEY is not configured in your `.env` file), "
                "we matched your question against the most mathematically relevant passages from your uploaded PDF.\n\n"
            )
            
        fallback_msg += (
            "Here are the top retrieved passages used to ground your inquiry:\n\n"
            + "\n\n".join([f"> **Passage {i+1} (Match Score: {chunk['score']:.2f}):**\n> \"{chunk['content'][:500]}...\"" for i, chunk in enumerate(retrieved_chunks)])
        )
        
        offline_fallback = {
            "success": True,
            "source": "Offline Cosine Similarity RAG",
            "answer": fallback_msg,
            "sources_used": sources_used
        }
        
        if not self.is_configured:
            return offline_fallback
            
        try:
            system_instruction = (
                "You are an expert academic tutor for competitive exams like JEE and NEET. Your goal is to answer the "
                "student's question strictly grounded on the provided retrieved context from their study material.\n\n"
                "Rules:\n"
                "1. Provide a comprehensive, clear, and highly conceptual step-by-step academic explanation.\n"
                "2. Maintain strict LaTeX mathematical formatting ($...$ for inline and $$...$$ for blocks) for all physical units and formulas.\n"
                "3. If the retrieved context is not sufficient to answer the question, do not make up facts. Answer the question using your general scientific expertise, but clearly place a caution note at the top of your answer:\n"
                "   > [!WARNING]\n"
                "   > This question is not directly covered in your study notes. Here is a general conceptual explanation:\n"
                "4. Structure your response with beautiful, organized markdown headers."
            )
            
            user_prompt = (
                f"Retrieved Study Material Context:\n\"\"\"\n{context_text}\n\"\"\"\n\n"
                f"Student Question:\n\"{question}\"\n\n"
                f"Grounded AI Answer:"
            )
            
            # Load the Gemini 2.5 Flash model
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction=system_instruction
            )
            
            response = model.generate_content(user_prompt)
            
            return {
                "success": True,
                "source": "Gemini 2.5 Flash (RAG Live)",
                "answer": response.text,
                "sources_used": sources_used
            }
            
        except Exception as err:
            logger.error(f"Gemini API RAG Error: {err}. Falling back to offline guide.")
            err_str = str(err)
            if "API_KEY_INVALID" in err_str or "API key" in err_str or "invalid" in err_str.lower():
                offline_fallback["answer"] = (
                    "### ❌ Invalid Gemini API Key\n"
                    "> **Authentication Error**: The `GEMINI_API_KEY` you configured in your `backend/.env` file is invalid or expired. "
                    "Please double check your key in your Google AI Studio account!\n\n"
                    "We have gracefully fallen back to offline comparison mode for now:\n\n"
                    + "\n\n".join([f"> **Passage {i+1} (Match Score: {chunk['score']:.2f}):**\n> \"{chunk['content'][:500]}...\"" for i, chunk in enumerate(retrieved_chunks)])
                )
            else:
                offline_fallback["error_details"] = err_str
            return offline_fallback



