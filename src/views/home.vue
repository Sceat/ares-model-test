<script setup>
import { onMounted, ref } from 'vue';
import {
  Scene,
  PerspectiveCamera,
  DirectionalLight,
  WebGLRenderer,
  Clock,
  Vector3,
  AmbientLight,
  GridHelper,
} from 'three';
import { GUI } from 'dat.gui';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { models } from './models.js';
import { spawn_model } from './entities.js';
import { known_variants, load } from './load_model.js';

const scene_div = ref(null);
const canvas = ref(null);

const light = new DirectionalLight(0xffffff, 2);
const ambient = new AmbientLight(0xffffff, 2);
const scene = new Scene();
const gui = new GUI();

let renderer = null;

const settings = {
  character: '',
  hat: '',
  hat_variant: '',
  cape: '',
  cape_variant: '',
  animation: '',
};

function get_random_color() {
  return Math.floor(Math.random() * 16777215);
}

let current_model = null;

onMounted(async () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);

  scene.userData.element = scene_div.value;
  scene.userData.camera = camera;
  // scene.background = new Color(0x999999);
  scene.background = null;

  renderer = new WebGLRenderer({
    canvas: canvas.value,
    // antialias: true,
    // alpha: true,
    preserveDrawingBuffer: true,
  });

  renderer.setClearColor(0xffffff, 0);
  // renderer.setClearColor(0xffffff, 1);
  renderer.setPixelRatio(window.devicePixelRatio);

  renderer.setSize(width, height, false);

  scene.add(ambient);

  light.position.set(1, 1, 1);

  camera.position.set(3, 3, 5);
  camera.lookAt(new Vector3(0, 1.5, 0));

  const controls = new OrbitControls(camera, renderer.domElement);

  scene.add(light);

  // Create a grid helper
  const size = 10; // Grid size (extends this far in both positive and negative directions)
  const divisions = 10; // Number of divisions in the grid
  const gridHelper = new GridHelper(size, divisions);

  // Position the grid at floor level (adjust Y value as needed based on your model's base position)
  gridHelper.position.y = 0;

  // Add the grid to your scene
  scene.add(gridHelper);

  const clock = new Clock();

  let animation_tab = null;

  gui
    .add(settings, 'character', { ...models.characters })
    .name('Displayed Model')
    .onFinishChange(async value => {
      console.log('switching model to', value);

      if (current_model) current_model.remove();
      if (animation_tab) {
        animation_tab.remove();
        animation_tab = null;
      }

      current_model = await spawn_model({
        path: value,
      }).then(spawn =>
        spawn({
          id: 0,
          scene,
        }),
      );
      current_model.move(new Vector3(0, 1, 0));
      current_model.animate('IDLE');
      current_model.set_colors(
        {
          color_1: get_random_color(),
          color_2: get_random_color(),
          color_3: get_random_color(),
        },
        renderer,
      );

      animation_tab = gui
        .add(settings, 'animation', current_model.animations)
        .name('Animation')
        .onFinishChange(value => {
          console.log('switching animation to', value);
          if (current_model) current_model.animate(value);
        });

      console.log('current model', current_model);
    });

  const current_equipment = {
    hat: null,
    hat_variant: null,
    cloak: null,
    cloak_variant: null,
  };

  let hat_variant_tab = null;
  let cloak_variant_tab = null;

  gui
    .add(settings, 'hat', models.equipments)
    .name('Helmet')
    .onFinishChange(async value => {
      console.log('switching hat to', value);

      current_equipment.hat?.remove?.();

      current_equipment.hat = await load(value).then(fn => fn());
      current_equipment.hat_variant = known_variants.get(value)?.[0];
      await current_model.set_equipment(current_equipment);

      if (hat_variant_tab) hat_variant_tab.remove();

      if (value.includes('hair'))
        current_model.set_colors(
          {
            color_1: get_random_color(),
            color_2: get_random_color(),
            color_3: get_random_color(),
          },
          renderer,
        );

      hat_variant_tab = gui
        .add(settings, 'hat_variant', known_variants.get(value))
        .name('Helmet Variant')
        .onFinishChange(async value => {
          console.log('switching hat variant to', value);
          current_equipment.hat_variant = value;
          current_model.set_equipment(current_equipment);
        });
    });

  gui
    .add(settings, 'cape', models.equipments)
    .name('Cloak')
    .onFinishChange(async value => {
      console.log('switching cloak to', value);

      current_equipment.cloak?.remove?.();

      current_equipment.cloak = await load(value).then(fn => fn());
      current_equipment.cloak_variant = known_variants.get(value)?.[0];
      current_model.set_equipment(current_equipment);

      if (cloak_variant_tab) cloak_variant_tab.remove();

      cloak_variant_tab = gui
        .add(settings, 'cape_variant', known_variants.get(value))
        .name('Cloak Variant')
        .onFinishChange(async value => {
          console.log('switching cloak variant to', value);
          current_equipment.cloak_variant = value;
          current_model.set_equipment(current_equipment);
        });
    });

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    controls.update();
    current_model?.mixer.update(delta);

    renderer.render(scene, camera);
  }

  animate();
});
</script>

<template lang="pug">
.container
  canvas.canvas(ref="canvas")
  .scene(ref="scene_div")
</template>

<style lang="stylus" scoped>
.container
  position relative
  display flex
  width 100vw
  height 100vh
  background-color #212121
  canvas
    width 100%
    height 100%
    position absolute
    top 0
    left 0
    z-index 0
    border: 1px solid red;
</style>
