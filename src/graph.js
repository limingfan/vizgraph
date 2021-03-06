require('svg-pan-zoom');
let Viz = require('viz.js');

let beforeUnloadMessage = null;
let resizeEvent = new Event("paneresize");
let parser = new DOMParser();
let worker;
let result;
let image;
// ------- Split -------

let Split = require('split.js');
Split(['#editor', '#graph'], {
    sizes: [40, 60],
    onDragEnd: function() {
        let svgOutput = document.getElementById("svg_output");
        if (svgOutput != null) {
        svgOutput.dispatchEvent(resizeEvent);
        }
    }
});

// ------- Ace Editor -------

let editor = ace.edit("editor");
//editor.setTheme("ace/theme/monokai");
document.getElementById('editor').style.fontSize='12px';
editor.getSession().setMode("ace/mode/dot");
editor.on("change", function() {
    updateGraph();
    beforeUnloadMessage = "Your changes will not be saved.";
});

// ------- Listening Action -------

window.addEventListener("beforeunload", function(e) {
    return beforeUnloadMessage;
});

document.querySelector("#engine select").addEventListener("change", function() {
    last_engin = document.querySelector("#engine select").value;
    updateGraph();
});

let svg_button = document.querySelector('button#save_svg');
let png_button = document.querySelector('button#save_png');
let json_button = document.querySelector('button#save_json');
let xdot_button = document.querySelector('button#save_xdot');
let plain_button = document.querySelector('button#save_plain');
let ps_button = document.querySelector('button#save_ps');

document.querySelector("#format select").addEventListener("change", function() {
    let now_format = document.querySelector("#format select").value;

    if (now_format === "svg") {
        svg_button.style.display = "inline-block";
        png_button.style.display = "none";
        json_button.style.display = "none";
        xdot_button.style.display = "none";
        plain_button.style.display = "none";
        ps_button.style.display = "none";
    } else if (now_format === "png-image-element") {
        svg_button.style.display = "none";
        png_button.style.display = "inline-block";
        json_button.style.display = "none";
        xdot_button.style.display = "none";
        plain_button.style.display = "none";
        ps_button.style.display = "none";
    } else if (now_format === "json") {
        svg_button.style.display = "none";
        png_button.style.display = "none";
        json_button.style.display = "inline-block";
        xdot_button.style.display = "none";
        plain_button.style.display = "none";
        ps_button.style.display = "none";
    } else if (now_format === "xdot") {
        svg_button.style.display = "none";
        png_button.style.display = "none";
        json_button.style.display = "none";
        xdot_button.style.display = "inline-block";
        plain_button.style.display = "none";
        ps_button.style.display = "none";
    } else if (now_format === "plain") {
        svg_button.style.display = "none";
        png_button.style.display = "none";
        json_button.style.display = "none";
        xdot_button.style.display = "none";
        plain_button.style.display = "inline-block";
        ps_button.style.display = "none";
    } else if (now_format === "ps") {
        svg_button.style.display = "none";
        png_button.style.display = "none";
        json_button.style.display = "none";
        xdot_button.style.display = "none";
        plain_button.style.display = "none";
        ps_button.style.display = "inline-block";
    }

    // if (document.querySelector("#format select").value === "svg") {
    //     document.querySelector("#raw").classList.remove("disabled");
    //     document.querySelector("#raw input").disabled = false;
    // } else {
    //     document.querySelector("#raw").classList.add("disabled");
    //     document.querySelector("#raw input").disabled = true;
    // }
    updateGraph();
});

// document.querySelector("#raw input").addEventListener("change", function() {
//     updateOutput();
// });

function download_blod(format) {
    let url = window.URL.createObjectURL(new Blob([result], { "type" : "text\/xml" }));

    let pre = document.querySelector("#engine select").value;

    let a = document.createElement("a");
    document.body.appendChild(a);
    a.setAttribute("class", "svg-crowbar");
    a.setAttribute("download", pre + "_graph." + format);
    a.setAttribute("href", url);
    a.style["display"] = "none";
    a.click();
    document.body.removeChild(a);
};

svg_button.addEventListener("click", function() {
    download_blod("svg");
});

png_button.addEventListener("click", function() {
    let pre = document.querySelector("#engine select").value;

    let a = document.createElement("a");
    document.body.appendChild(a);
    a.setAttribute("class", "svg-crowbar");
    a.setAttribute("download", pre + "_graph.png");
    a.setAttribute("href", image.src);
    a.style["display"] = "none";
    a.click();
    document.body.removeChild(a);
});

json_button.addEventListener("click", function() {
    download_blod("json");
});

xdot_button.addEventListener("click", function() {
    download_blod("xdot");
});

plain_button.addEventListener("click", function() {
    download_blod("plain");
});

ps_button.addEventListener("click", function() {
    download_blod("ps");
});

// ------- Key Function -------

function updateGraph()
{
    if (worker)
    {
        worker.terminate();
    }

    document.querySelector("#output").classList.add("working");
    document.querySelector("#output").classList.remove("error");

    worker = new Worker("src/worker.js");
    worker.onmessage = function(e) {
        document.querySelector("#output").classList.remove("working");
        document.querySelector("#output").classList.remove("error");

        result = e.data;

        updateOutput();
    }

    worker.onerror = function(e) {
        document.querySelector("#output").classList.remove("working");
        document.querySelector("#output").classList.add("error");

        let message = e.message === undefined ? "An error occurred while processing the graph input." : e.message;

        let error = document.querySelector("#error");
        while (error.firstChild) {
            error.removeChild(error.firstChild);
        }

        document.querySelector("#error").appendChild(document.createTextNode(message));
        
        console.error(e);
        e.preventDefault();
    }

    let params = {
        src: editor.getSession().getDocument().getValue(),
        options: {
            engine: document.querySelector("#engine select").value,
            format: document.querySelector("#format select").value
        }
    };

    // Instead of asking for png-image-element directly, which we can't do in a worker,
    // ask for SVG and convert when updating the output.
    
    if (params.options.format == "png-image-element") {
        params.options.format = "svg";
    }

    worker.postMessage(params);
}

function updateOutput()
{
    let graph = document.querySelector("#output");

    let svg = graph.querySelector("svg");
    if (svg) {
        graph.removeChild(svg);
    }

    let text = graph.querySelector("#text");
    if (text) {
        graph.removeChild(text);
    }

    let img = graph.querySelector("img");
    if (img) {
        graph.removeChild(img);
    }

    if (!result) {
        return;
    }

    if (document.querySelector("#format select").value == "svg") { //&& !document.querySelector("#raw input").checked) {
        let svg = parser.parseFromString(result, "image/svg+xml").documentElement;
        svg.id = "svg_output";
        graph.appendChild(svg);

        panZoom = svgPanZoom(svg, {
            zoomEnabled: true,
            controlIconsEnabled: true,
            fit: true,
            center: true,
            minZoom: 0.1
        });

        svg.addEventListener('paneresize', function(e) {
            panZoom.resize();
        }, false);

        window.addEventListener('resize', function(e) {
            panZoom.resize();
        });
    } else if (document.querySelector("#format select").value == "png-image-element") {
        image = Viz.svgXmlToPngImageElement(result);
        graph.appendChild(image);
    } else {
        let text = document.createElement("div");
        text.id = "text";
        text.appendChild(document.createTextNode(result));
        graph.appendChild(text);
    }
}

updateGraph();
