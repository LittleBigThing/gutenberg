/**
 * External dependencies
 */
import { connect } from 'react-redux';
import 'element-closest';

/**
 * WordPress dependencies
 */
import { Component } from 'element';
import { keycodes, focus } from '@wordpress/utils';
import { find, reverse } from 'lodash';
/**
 * Internal dependencies
 */
import { 
	isHorizontalEdge,
	isVerticalEdge,
	computeCaretRect,
	placeCaretAtHorizontalEdge,
	placeCaretAtVerticalEdge
} from '../utils/dom';
import {
	getBlockUids,
	getMultiSelectedBlocksStartUid,
	getMultiSelectedBlocksEndUid,
	getMultiSelectedBlocks,
	getSelectedBlock,
} from '../selectors';

import { multiSelect } from '../actions';


/**
 * Module Constants
 */
const { UP, DOWN, LEFT, RIGHT } = keycodes;

class WritingFlow extends Component {
	constructor() {
		super( ...arguments );

		this.onKeyDown = this.onKeyDown.bind( this );
		this.bindContainer = this.bindContainer.bind( this );
		this.verticalRect = null;
	}

	bindContainer( ref ) {
		this.container = ref;
	}

	getEditables( target ) {
		const outer = target.closest( '.editor-visual-editor__block-edit' );
		if ( ! outer || target === outer ) {
			return [ target ];
		}

		const elements = outer.querySelectorAll( '[contenteditable="true"]' );
		return [ ...elements ];
	}

	getVisibleTabbables() {
		return focus.tabbable
			.find( this.container )
			.filter( ( node ) => (
				node.nodeName === 'INPUT' ||
				node.nodeName === 'TEXTAREA' ||
				node.contentEditable === 'true' ||
				node.classList.contains( 'editor-visual-editor__block-edit' )
			) );
	}

	getClosestTabbable( target, isReverse ) {
		let focusableNodes = this.getVisibleTabbables();

		if ( isReverse ) {
			focusableNodes = reverse( focusableNodes );
		}

		focusableNodes = focusableNodes.slice( focusableNodes.indexOf( target ) );

		return find( focusableNodes, ( node, i, array ) => {
			if ( node.contains( target ) ) {
				return false;
			}

			const nextNode = array[ i + 1 ];

			// Skip node if it contains a focusable node.
			if ( nextNode && node.contains( nextNode ) ) {
				return false;
			}

			return true;
		} );
	}

	expandSelection( blocks, currentStartUid, currentEndUid, moveUp ) {
		const delta = moveUp ? -1 : +1;
		const lastIndex = blocks.indexOf( currentEndUid );
		const nextIndex = Math.max( 0, Math.min( blocks.length - 1, lastIndex + delta ) );
		this.props.onMultiSelect( currentStartUid, blocks[ nextIndex ] );
	}

	isEditableEdge( moveUp, target ) {
		const editables = this.getEditables( target );
		const index = editables.indexOf( target );
		const edgeIndex = moveUp ? 0 : editables.length - 1;
		return editables.length > 0 && index === edgeIndex;
	}

	onKeyDown( event ) {
		const { selectedBlock, selectionStart, selectionEnd, blocks, hasMultiSelection } = this.props;

		const { keyCode, target } = event;
		const isUp = keyCode === UP;
		const isDown = keyCode === DOWN;
		const isLeft = keyCode === LEFT;
		const isRight = keyCode === RIGHT;
		const isReverse = isUp || isLeft;
		const isHorizontal = isLeft || isRight;
		const isVertical = isUp || isDown;

		const isShift = event.shiftKey;
		if ( isVertical && isShift && hasMultiSelection ) {
			// Shift key is down and existing block selection
			event.preventDefault();
			this.expandSelection( blocks, selectionStart, selectionEnd, isReverse ? -1 : +1 );
		} else if ( isVertical && isShift && this.isEditableEdge( isReverse, target ) && isVerticalEdge( target, isReverse, true ) ) {
			// Shift key is down, but no existing block selection
			event.preventDefault();
			this.expandSelection( blocks, selectedBlock.uid, selectedBlock.uid, isReverse ? -1 : +1 );
		} else if ( isVertical && isVerticalEdge( target, isReverse ) ) {
			const closestTabbable = this.getClosestTabbable( target, isReverse );
			placeCaretAtVerticalEdge( closestTabbable, isReverse, this.verticalRect );
			event.preventDefault();
		} else if ( isHorizontal && isHorizontalEdge( target, isReverse ) ) {
			const closestTabbable = this.getClosestTabbable( target, isReverse );
			placeCaretAtHorizontalEdge( closestTabbable, isReverse );
			event.preventDefault();
		}
	}

	render() {
		const { children } = this.props;

		return (
			<div
				ref={ this.bindContainer }
				onKeyDown={ this.onKeyDown }
				onMouseDown={ () => this.verticalRect = null }
			>
				{ children }
			</div>
		);
	}
}

export default connect(
	( state ) => ( {
		blocks: getBlockUids( state ),
		selectionStart: getMultiSelectedBlocksStartUid( state ),
		selectionEnd: getMultiSelectedBlocksEndUid( state ),
		hasMultiSelection: getMultiSelectedBlocks( state ).length > 1,
		selectedBlock: getSelectedBlock( state ),
	} ),
	( dispatch ) => ( {
		onMultiSelect( start, end ) {
			dispatch( multiSelect( start, end ) );
		},
	} )
)( WritingFlow );
