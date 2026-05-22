import fitz

def create_pdf():
    doc = fitz.open()
    page = doc.new_page()
    rect = fitz.Rect(50, 50, 550, 750)
    text = (
        "Electromagnetic Induction and Faraday's Law\n\n"
        "Faraday's Law of Electromagnetic Induction states that the induced electromotive force (EMF) "
        "in any closed circuit is equal to the negative of the time rate of change of the magnetic flux "
        "through the circuit. Mathematically, it is expressed as:\n"
        "$$e = -\\frac{d\\Phi_B}{dt}$$\n"
        "where e is the induced EMF and \\Phi_B is the magnetic flux.\n\n"
        "Lenz's Law states that the direction of the induced current is always such that it opposes the "
        "change in magnetic flux that produced it. This is why there is a negative sign in Faraday's Law. "
        "It is a direct consequence of the conservation of energy.\n\n"
        "Magnetic Susceptibility (\\chi) is a dimensionless proportionality constant that indicates the degree "
        "of magnetization of a material in response to an applied magnetic field. "
        "Diamagnetic materials oppose external magnetic fields, resulting in a negative magnetic susceptibility (\\chi < 0) "
        "and a relative permeability slightly less than 1.\n"
    )
    page.insert_textbox(rect, text, fontsize=11)
    
    # Let's add a second page about organic chemistry to have more content for testing
    page2 = doc.new_page()
    rect2 = fitz.Rect(50, 50, 550, 750)
    text2 = (
        "Organic Chemistry - SN1 Reaction Mechanism\n\n"
        "The SN1 reaction is a substitution nucleophilic unimolecular reaction. It is a two-step mechanism "
        "where the rate-determining step is the loss of the leaving group to form a carbocation intermediate.\n\n"
        "Step 1: Heterolytic cleavage of the carbon-leaving group bond to form a carbocation intermediate. This is the slow, rate-determining step.\n"
        "Step 2: Attack of the nucleophile on the electrophilic carbocation center. This is a fast step.\n\n"
        "Carbocation Stability:\n"
        "Tertiary (3-degree) carbocations are highly stabilized by hyperconjugation and positive inductive (+I) effects from three surrounding alkyl groups, "
        "making them the most stable intermediates and highly favored for SN1 reactions compared to secondary and primary carbocations.\n"
    )
    page2.insert_textbox(rect2, text2, fontsize=11)
    
    doc.save("../physics_electromagnetism.pdf")
    print("Test PDF successfully created at ../physics_electromagnetism.pdf!")

if __name__ == "__main__":
    create_pdf()
