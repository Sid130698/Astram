export function handleBrahmastraCollision(scene, arrow1, arrow2) {
    if (arrow1.getData('hasResolved') || arrow2.getData('hasResolved')) return;

    const impactX = (arrow1.x + arrow2.x) / 2;
    const impactY = (arrow1.y + arrow2.y) / 2;

    scene.spawnImpactFlash(impactX, impactY);

    if (!scene.isHitStopActive) {
        scene.isHitStopActive = true;
        scene.physics.pause();
        if (scene.player.anims.isPlaying) scene.player.anims.pause();
        if (scene.enemy.anims.isPlaying) scene.enemy.anims.pause();

        // Massive shake and flash for Brahmastra
        scene.cameras.main.shake(800, 0.08);
        scene.cameras.main.flash(800, 200, 230, 255);

        // Explode
        scene.spawnFireExplosion(impactX, impactY);
        scene.time.delayedCall(150, () => scene.spawnFireExplosion(impactX - 20, impactY - 10));
        scene.time.delayedCall(300, () => scene.spawnFireExplosion(impactX + 20, impactY - 10));

        scene.time.delayedCall(800, () => {
            scene.isHitStopActive = false;
            
            if (scene.isMatchOver) return;

            scene.physics.resume();
            if (scene.player.anims.isPaused) scene.player.anims.resume();
            if (scene.enemy.anims.isPaused) scene.enemy.anims.resume();

            // Huge Knockback
            scene.triggerKnockback(-600, 600);
        });
    }

    scene.disableProjectile(arrow1);
    scene.disableProjectile(arrow2);
    scene.resolveArrow(arrow1, 0, true);
    scene.resolveArrow(arrow2, 0, true);
}
