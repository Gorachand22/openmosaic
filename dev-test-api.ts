async function runApiTest() {
    const payload = {
        tileType: "manim",
        inputs: {
        },
        config: {
            script: `
# Complex 3Blue1Brown style animation
axes = Axes(
    x_range=[-3, 3],
    y_range=[-3, 3],
    axis_config={"color": BLUE},
)
circle = Circle(radius=2, color=YELLOW)
self.play(Create(axes))
self.play(Create(circle))

dot = Dot(color=RED)
dot.move_to(axes.c2p(2, 0))

# Custom updater to make the dot travel along the circle
def update_dot(d, dt):
    d.rotate(dt, about_point=axes.c2p(0, 0))
    
dot.add_updater(update_dot)
self.add(dot)

# Let the simulation run for a few seconds
self.wait(2)
dot.remove_updater(update_dot)

text = Text("3Blue1Brown Style Animation", font_size=24)
text.to_edge(UP)
self.play(Write(text))
self.wait(1)
`,
            quality: "l",
            format: "mp4"
        }
    };

    try {
        const res = await fetch("http://localhost:3000/api/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            console.error("HTTP Error:", res.status, res.statusText);
            const text = await res.text();
            console.error(text);
            return;
        }
        const text = await res.text();
        console.log(text);
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

runApiTest();
