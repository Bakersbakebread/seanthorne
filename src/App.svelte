<script>
  import Bubble from "./lib/components/Bubble.svelte";
</script>

<main>
  <div class="bubbles">
    <Bubble delay="1">👋 Hello</Bubble>
    <Bubble delay="2">I'm Sean!</Bubble>
    <Bubble delay="3">I make things with code for the web</Bubble>
    <Bubble delay="4">You can contact me at <a href="mailto:hello@seanthorne.co.uk">hello@seanthorne.co.uk</a></Bubble>
    <Bubble delay="5">Or check out:
      <br/>
      <a
      href="https://github.com/bakersbakebread"
      target="_blank"
      rel="noreferrer"
      title="Twitter Link">github.com/bakersbakebread</a>
      <br/>
      <a
      href="https://twitter.com/seanthorne"
      target="_blank"
      rel="noreferrer"
      title="Twitter Link">twitter.com/seanthorne</a>
    </Bubble>
    <Bubble delay="6">Cya! 😎</Bubble>

  </div>
</main>

<style lang="scss">
  main {
    padding: 0;
    margin: 0;
  }

  .bubbles {
    padding: clamp(0.1rem, 5vw, 5rem);
    display: flex;
    flex-direction: column;
    
  }
</style>
