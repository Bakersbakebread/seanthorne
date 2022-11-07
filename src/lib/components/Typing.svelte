<div class="typing">
    <div class="dot" />
    <div class="dot" />
    <div class="dot" />
</div>

<style lang="scss">
@keyframes mercuryTypingAnimation {
	0% {
		transform: translateY(0px);
		background-color: #6cad96;
	}
	28% {
		transform: translateY(-7px);
		background-color: #9ecab9;
	}
	44% {
		transform: translateY(0px);
		background-color: #b5d9cb;
	}
}

$sizeOfDot: 1.4rem;

.typing {
	align-items: center;
	display: flex;
	min-height: 17px;
	padding: 4rem;
	.dot {
		animation: mercuryTypingAnimation 500ms infinite ease-in-out;
		background-color: #6cad96;
		border-radius: 50%;
		height: $sizeOfDot;
		margin-right: 4px;
		vertical-align: middle;
		width: $sizeOfDot;
		display: inline-block;
		&:nth-child(1) {
			animation-delay: 200ms;
		}
		&:nth-child(2) {
			animation-delay: 300ms;
		}
		&:nth-child(3) {
			animation-delay: 400ms;
		}
		&:last-child {
			margin-right: 0;
		}
	}
}

</style>
