// split_union_nut_57p3_threaded.scad
// Split moer met (vereenvoudigde) interne schroefdraad, 2 helften.
// Doelopening: 57.3 mm
//
// BELANGRIJK:
// - Schroefdraad van spa/heater unions is vaak merkspecifiek.
// - Start met een testprint van 8-10 mm hoogte en tune thread_pitch/thread_depth/speling.
//
// Export:
// - export_part = "A" -> STL
// - export_part = "B" -> STL

$fn = 180;

// ===== Kernmaten =====
opening_d           = 57.3;  // gevraagde opening (mm)
nut_outer_d         = 88.0;  // buitenmaat moer (pas aan op ruimte)
nut_height          = 22.0;  // totale hoogte

// ===== Schroefdraad (interne, benadering) =====
thread_pitch        = 2.5;   // mm per omwenteling (tunen)
thread_depth        = 1.4;   // radiale diepte (tunen)
thread_flank_angle  = 60;    // V-profiel, vereenvoudigd
thread_clearance    = 0.35;  // extra speling voor printfit
thread_starts       = 1;     // meestal 1

// ===== Split / klemoren =====
ear_len             = 14.0;
ear_thickness       = 8.0;
bolt_d              = 5.5;   // M5 clearance
bolt_z_margin       = 6.0;

// ===== Export =====
export_part         = "preview"; // preview | A | B

// -----------------------------
Rin_nom = opening_d/2;
Rout = nut_outer_d/2;
thread_root_r = Rin_nom + thread_clearance;       // waar draad begint
thread_peak_r = thread_root_r + thread_depth;     // piek richting buiten

module ring_blank(){
  difference(){
    cylinder(d=nut_outer_d, h=nut_height, center=true);
    // kernboring tot aan draad-root
    cylinder(d=2*thread_root_r, h=nut_height+0.4, center=true);
  }
}

// Vereenvoudigde interne schroefdraad door helix-subtractie
module internal_thread_cut(){
  turns = nut_height / thread_pitch;
  // Driehoekig draadprofiel (2D), daarna helix via twist
  profile_h = thread_depth;
  profile_w = max(0.3, thread_pitch*0.52);

  // profiel georiënteerd radiaal
  module tooth2d(){
    polygon(points=[
      [0, -profile_w/2],
      [profile_h, 0],
      [0, profile_w/2]
    ]);
  }

  for (s=[0:thread_starts-1]){
    rotate([0,0, s*(360/thread_starts)])
      translate([thread_root_r,0,-nut_height/2-0.2])
        linear_extrude(height=nut_height+0.4, twist=-360*turns, convexity=10)
          tooth2d();
  }
}

module half_split_keep(){
  // Houd helft y>=0
  translate([0,Rout,0]) cube([nut_outer_d*2, nut_outer_d, nut_height+2], center=true);
}

module ears(){
  z1 = -nut_height/2 + bolt_z_margin;
  z2 =  nut_height/2 - bolt_z_margin;
  x  = Rout + ear_len/2;

  difference(){
    union(){
      for (z=[z1,z2]){
        translate([ x,0,z]) cube([ear_len, ear_thickness, ear_thickness], center=true);
        translate([-x,0,z]) cube([ear_len, ear_thickness, ear_thickness], center=true);
      }
    }
    for (z=[z1,z2]){
      translate([ x,0,z]) rotate([90,0,0]) cylinder(d=bolt_d, h=ear_thickness+2, center=true);
      translate([-x,0,z]) rotate([90,0,0]) cylinder(d=bolt_d, h=ear_thickness+2, center=true);
    }
  }
}

module half_nut(){
  intersection(){
    union(){
      difference(){
        ring_blank();
        internal_thread_cut();
      }
      ears();
    }
    half_split_keep();
  }
}

module partA(){ half_nut(); }
module partB(){ mirror([0,1,0]) half_nut(); }

if (export_part=="A") partA();
else if (export_part=="B") partB();
else {
  translate([0,1.2,0]) color("royalblue") partA();
  translate([0,-1.2,0]) color("seagreen") partB();
}
