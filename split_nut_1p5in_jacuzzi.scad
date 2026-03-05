// split_nut_1p5in_jacuzzi.scad
// Parametrische split nut / klemring (2 helften) voor ±1.5" jacuzzi/pvc pijp.
// Standaard op basis van veelvoorkomende OD 48.3 mm.
//
// Export tips:
// - Zet export_part = "A" en exporteer STL
// - Zet export_part = "B" en exporteer STL
//
// OpenSCAD: Design -> Render (F6) -> Export -> STL

$fn = 180;

// -------------------------
// Parameters
// -------------------------
pipe_od            = 48.3;   // Gemeten buitendiameter pijp (mm)
radial_wall        = 8.0;    // Wanddikte rondom pijp (mm)
ring_width         = 24.0;   // Axiale breedte van de split nut (mm)
clearance_diam     = 0.5;    // Extra speling op pijpdiameter (mm)

// O-ring groef (optioneel)
use_oring_groove   = true;
oring_cs           = 3.0;    // O-ring doorsnede (bijv. 3.0 mm)
oring_squeeze      = 0.25;   // 25% compressie
oring_offset_z     = 0.0;    // 0 = midden van de ring

// Boutoren (2 stuks)
bolt_diam          = 5.5;    // M5 clearance
ear_thickness      = 7.0;
ear_extension      = 11.0;   // Hoe ver oren buiten ring steken
bolt_edge_margin   = 7.0;    // Afstand gatcentrum tot ring-uiteinde in Z

// Export-keuze: "preview", "A", "B"
export_part        = "preview";

// -------------------------
// Afgeleide maten
// -------------------------
inner_d = pipe_od + clearance_diam;
outer_d = inner_d + 2*radial_wall;
Rout    = outer_d/2;
Rin     = inner_d/2;

oring_depth  = use_oring_groove ? oring_cs*oring_squeeze : 0;
oring_width  = use_oring_groove ? oring_cs*1.08 : 0;
oring_center_r = Rin + (oring_depth - oring_cs/2);

module half_body(){
    // Basis halve ring
    intersection(){
        difference(){
            cylinder(h=ring_width, d=outer_d, center=true);
            cylinder(h=ring_width+0.5, d=inner_d, center=true);

            // O-ring groef (interne circumferentiële groef)
            if(use_oring_groove){
                translate([0,0,oring_offset_z])
                rotate_extrude(convexity=10)
                    translate([oring_center_r,0,0])
                        square([oring_width, oring_cs], center=true);
            }
        }

        // Snij naar halve geometrie (y >= 0)
        translate([0, Rout, 0])
            cube([outer_d*2, outer_d, ring_width+2], center=true);
    }
}

module ears_and_holes(){
    z1 = -ring_width/2 + bolt_edge_margin;
    z2 =  ring_width/2 - bolt_edge_margin;
    x_ear = Rout + ear_extension/2;

    // Oren toevoegen
    difference(){
        union(){
            for (zv=[z1,z2]){
                translate([ x_ear, 0, zv]) cube([ear_extension, ear_thickness, ear_thickness], center=true);
                translate([-x_ear, 0, zv]) cube([ear_extension, ear_thickness, ear_thickness], center=true);
            }
        }

        // Boutgaten door oren (Y-richting)
        for (zv=[z1,z2]){
            translate([ x_ear, 0, zv]) rotate([90,0,0]) cylinder(h=ear_thickness+2, d=bolt_diam, center=true);
            translate([-x_ear, 0, zv]) rotate([90,0,0]) cylinder(h=ear_thickness+2, d=bolt_diam, center=true);
        }
    }
}

module split_nut_half(){
    union(){
        half_body();
        ears_and_holes();
    }
}

module part_A(){
    split_nut_half();
}

module part_B(){
    mirror([0,1,0]) split_nut_half();
}

if (export_part == "A") {
    part_A();
} else if (export_part == "B") {
    part_B();
} else {
    // Preview beide helften met kleine spleet
    translate([0, 1.5, 0]) color("royalblue") part_A();
    translate([0,-1.5, 0]) color("seagreen") part_B();
}
