# Reddit release checklist

- [ ] Put the code in a public source repository.
- [ ] Deploy the Node/Docker service to a public HTTPS URL.
- [ ] Attach a persistent volume for `CACHE_FILE`.
- [ ] Run `npm test` on the deployed commit.
- [ ] Verify `/api/health` says `loginRequired: false`.
- [ ] Test live stock for at least one current core/expansion, one standalone, one legacy item, and one OOP item.
- [ ] Repeat the same lookup and confirm it comes from the shared cache.
- [ ] Restart the service and confirm the cached result survives.
- [ ] Test Android/iPhone-sized layout.
- [ ] Test collection export, reset, and re-import.
- [ ] Confirm no admin key or secret exists in frontend/source history.
- [ ] Add a short privacy/no-login note to the Reddit post.
- [ ] Add a bug-report/source link so the community can report missing products and retailer parser failures.
