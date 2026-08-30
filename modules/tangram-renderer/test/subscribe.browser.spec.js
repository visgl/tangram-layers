// Tangram
// SPDX-License-Identifier: MIT
// Copyright (c) 2013-2016 Brett Camper and Mapzen

import subscribeMixin from '../src/utils/subscribe';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

describe('subscribeMixin', () => {
    let subject;

    class A {
        constructor() {
            subscribeMixin(this);
        }
    }

    beforeEach(() => {
        subject = new A();
    });

    afterEach(() => {
        subject = undefined;
    });

    it('fires all of the events that are subscribed', () => {
        const spyA = vi.fn();
        const spyB = vi.fn();
        const spyC = vi.fn();
        const spyD = vi.fn();

        subject.subscribe({ test: spyA });
        subject.subscribe({ test: spyB });
        subject.subscribe({ test: spyC });
        subject.subscribe({ test: spyD });

        expect(spyA).not.toHaveBeenCalled();
        expect(spyB).not.toHaveBeenCalled();
        expect(spyC).not.toHaveBeenCalled();
        expect(spyD).not.toHaveBeenCalled();

        subject.trigger('test');

        expect(spyA).toHaveBeenCalled();
        expect(spyB).toHaveBeenCalled();
        expect(spyC).toHaveBeenCalled();
        expect(spyD).toHaveBeenCalled();
    });

    it('does not fires events that are unsubscribed', () => {
        const spyA = vi.fn();
        const spyB = vi.fn();
        const spyC = vi.fn();
        const spyD = vi.fn();

        let subscriberA = { test: spyA },
            subscriberB = { test: spyB },
            subscriberC = { test: spyC },
            subscriberD = { test: spyD };

        subject.subscribe(subscriberA);
        subject.subscribe(subscriberB);
        subject.subscribe(subscriberC);
        subject.subscribe(subscriberD);

        subject.unsubscribe(subscriberA);
        subject.unsubscribe(subscriberB);
        subject.unsubscribe(subscriberC);

        subject.trigger('test');

        expect(spyA).not.toHaveBeenCalled();
        expect(spyB).not.toHaveBeenCalled();
        expect(spyC).not.toHaveBeenCalled();
        expect(spyD).toHaveBeenCalled();
    });

    it('does not fire any events when they are all unsubscribed', () => {
        const spyA = vi.fn();
        const spyB = vi.fn();
        const spyC = vi.fn();
        const spyD = vi.fn();

        subject.subscribe({ test: spyA });
        subject.subscribe({ test: spyB });
        subject.subscribe({ test: spyC });
        subject.subscribe({ test: spyD });

        expect(spyA).not.toHaveBeenCalled();
        expect(spyB).not.toHaveBeenCalled();
        expect(spyC).not.toHaveBeenCalled();
        expect(spyD).not.toHaveBeenCalled();

        subject.unsubscribeAll();
        subject.trigger('test');

        expect(spyA).not.toHaveBeenCalled();
        expect(spyB).not.toHaveBeenCalled();
        expect(spyC).not.toHaveBeenCalled();
        expect(spyD).not.toHaveBeenCalled();
    });


});
