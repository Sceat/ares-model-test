import {
  BoxGeometry,
  Color,
  Group,
  LoopOnce,
  Mesh,
  Quaternion,
  Vector3,
} from 'three';

import dispose from './dispose.js';
import { load } from './load_model.js';

const MODEL_FORWARD = new Vector3(0, 0, 1);

function fade_to_animation(from, to, duration = 0.3) {
  if (from !== to) {
    from?.fadeOut(duration);
    to.reset().fadeIn(duration).play();
  }
}

function find_bone(origin, name) {
  let bone = null;
  origin.traverse(child => {
    // @ts-ignore
    if (child.isBone && child.name.toLowerCase().includes(name.toLowerCase()))
      bone = child;
  });

  if (!bone) alert(`${name} bone not found`);

  return bone;
}

function entity_spawner(
  load_model,
  { height = 1.5, radius = 0.8, scale = 1, hair = null },
) {
  return async ({ id, name = '', scene = null, scale_factor = 1 }) => {
    const {
      model,
      compute_animations,
      animations,
      set_variant,
      variants,
      custom_colors,
    } = await load_model();
    const { mixer, actions } = compute_animations();

    model.scale.set(
      scale * scale_factor,
      scale * scale_factor,
      scale * scale_factor,
    );

    const origin = new Group();
    const hitbox = new Mesh(
      new BoxGeometry(radius, height, radius),
      // new MeshBasicMaterial({ color: 0x00ff00, wireframe: true }),
    );

    hitbox.name = 'hitbox';
    hitbox.visible = false;
    hitbox.geometry.computeBoundingBox();

    origin.add(model);
    origin.add(hitbox);

    model.position.y -= height * 0.5;

    scene.add(origin);

    let current_animation = actions.IDLE;
    const last_animation_frame = 0;

    if (actions.JUMP) actions.JUMP.setLoop(LoopOnce, 1);

    current_animation?.play();

    // this function must be atomic, to avoid having both hair and helmet equipped at the same time
    let equip_items_promise = Promise.resolve();
    let custom_hat_colors = null;

    async function equip_hat(hat, variant) {
      const head = find_bone(model, 'head');
      head.clear();

      console.log('Equipping hat', hat, variant);

      if (!hat) return;

      const {
        model: hat_model,
        custom_colors: new_custom_hat_colors,
        set_variant,
      } = hat;

      if (!hat_model) return;
      if (variant) set_variant(variant);

      head.add(hat_model);
      custom_hat_colors = new_custom_hat_colors;
    }

    async function equip_cape(cape, variant) {
      const back = find_bone(model, 'cape');
      back.clear();

      if (!cape) return;

      const { model: cape_model, set_variant } = cape;

      if (!cape_model) return;
      if (variant) set_variant(variant);

      cape_model.rotation.set(Math.PI, 0,0);
      // cape_model.position.y -= 0.1;
      // cape_model.position.z -= 0.1;
      back.add(cape_model);
    }

    function set_colors({ color_1, color_2, color_3 }, renderer) {
      if (!custom_colors) return;

      custom_colors.set_color1(color_1);
      custom_hat_colors?.set_color1(color_1);

      custom_colors.set_color2(color_2);
      custom_hat_colors?.set_color2(color_2);

      custom_colors.set_color3(color_3);
      custom_hat_colors?.set_color3(color_3);

      if (custom_colors.needsUpdate()) custom_colors.update(renderer);
      if (custom_hat_colors?.needsUpdate()) custom_hat_colors.update(renderer);
    }

    if (variants.length) set_variant(variants[0]);

    return {
      id,
      height,
      radius,
      mixer,
      object3d: origin,
      jump_time: 0,
      audio: null,
      action: 'IDLE',
      animations,
      move(position) {
        // @ts-ignore
        if (origin.position.distanceTo(position) < 0.01) return;
        origin.position.copy(position);
      },
      rotate(movement) {
        // Normalize the movement vector in the horizontal plane (x-z)
        const flat_movement = movement.clone().setY(0).normalize();
        // Calculate the target quaternion: this rotates modelForward to align with flatMovement
        const quaternion = new Quaternion().setFromUnitVectors(
          MODEL_FORWARD,
          flat_movement,
        );
        origin.quaternion.copy(quaternion);
      },
      remove() {
        scene.remove(origin);
        dispose(origin);

        if (custom_colors) {
          custom_colors.dispose();
        }
      },
      animate(name) {
        const animation = actions[name];
        if (animation && animation !== current_animation) {
          fade_to_animation(current_animation, animation);
          current_animation = animation;
        }
      },
      position: origin.position,
      target_position: null,
      set_variant,
      custom_colors,
      async set_equipment({ hat, hat_variant, cloak, cloak_variant }) {
        equip_items_promise = equip_items_promise.then(async () => {
          await equip_hat(hat, hat_variant);
          await equip_cape(cloak, cloak_variant);
        });
        return equip_items_promise;
      },
      set_colors,
    };
  };
}

export async function spawn_model({ path, hair }) {
  return entity_spawner(await load(path), { hair });
}
