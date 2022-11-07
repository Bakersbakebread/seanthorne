<script>
    import { onMount } from "svelte";
    import Typing from "./Typing.svelte";

    export let delay;

    let time = new Date();

    // these automatically update when `time`
    // changes, because of the `$:` prefix
    let hours = time.getHours();
    let minutes = (time.getMinutes() < 10 ? "0" : "") + time.getMinutes();

    let formattedTime = `${hours}:${minutes}`;

    let isLoading = false;
    let finishied = false;

    onMount(() => {
        setTimeout(() => {
            isLoading = true;
        }, (delay * 1500) + 100);
        setTimeout(() => {
            isLoading = false;
            finishied = true
        }, (delay * 1800) + 200);
    });
</script>

{#if isLoading}
    <Typing/>
{:else}
<div class="bubble {finishied ? 'loading' : '' }">
    <span>
        <slot />
    </span>

    <span class="bubble--time">{formattedTime}</span>
</div>
{/if}
  

<style lang="scss">
    .bubble {
        display: inline-flex;
        background-color: #202c33;
        border-radius: 20px;
        margin: clamp(0.2rem, 5vw, 1rem);
        font-size: clamp(1rem, 4vw, 3rem);
        color: #e9edef;
        width: fit-content;
        line-height: clamp(1.25rem, 5vw, 4.25rem);
        animation: fadeIn 200ms ease-in-out forwards;
        display: none;
    }
    .loading {
        display: inline-flex !important;
    }
    .bubble span {
        padding: 2rem;
        margin: 0;
    }
    .bubble--time {
        margin: 0.5rem;
        padding-right: 0.5rem;
        font-size: 1.2rem;
        align-self: flex-end;
    }


    @keyframes fadeIn {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

</style>
